import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

function safeBool(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function safeInt(v: any, fallback = 0): number {
  const n = parseInt(v);
  return isNaN(n) ? fallback : n;
}

function safeFloat(v: any, fallback = 0): number {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function safeStr(v: any, fallback = ''): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function normalizeMeterType(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'قانوني' || s === 'legal') return 'legal';
  if (s === 'كودي' || s === 'ممارسة' || s === 'codi') return 'codi';
  if (s.length === 0) return null;
  return s;
}

function buildOtherFeatures(features: any): any | null {
  if (!features || typeof features !== 'object') return null;
  const safe: any = {};
  for (const [k, v] of Object.entries(features)) {
    if (k === 'has_elevator' || k === 'has_parking' || k === 'is_licensed' || k === 'meter_type') continue;
    if (v === undefined) continue;
    safe[k] = v;
  }
  if (Object.keys(safe).length === 0) return null;
  return safe;
}

function buildFeaturesCreate(features: any): any {
  const raw = (features && typeof features === 'object') ? features : {};
  const payload: any = {
    has_elevator: safeBool(raw.has_elevator),
    has_parking: safeBool(raw.has_parking),
    is_licensed: safeBool(raw.is_licensed),
    meter_type: normalizeMeterType(raw.meter_type || raw.electricity_meter_type),
  };
  const extras = buildOtherFeatures(raw);
  if (extras !== null) payload.other_features = extras;
  return payload;
}

// Create Property
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const raw = req.body || {};
    const owner_id = safeInt(raw.owner_id, NaN);

    if (isNaN(owner_id) || owner_id <= 0) {
      return res.status(400).json({ message: 'owner_id مطلوب وغير صالح' });
    }
    const type = safeStr(raw.type);
    if (!type) {
      return res.status(400).json({ message: 'نوع العقار مطلوب (type)' });
    }
    if (raw.price === undefined || raw.price === null || raw.area === undefined || raw.area === null) {
      return res.status(400).json({ message: 'السعر والمساحة مطلوبين' });
    }

    const safeMedia = Array.isArray(raw.media) ? raw.media : [];

    const data: any = {
      owner_id,
      type,
      operation_type: safeStr(raw.operation_type, 'sale'),
      price: safeFloat(raw.price),
      area: safeFloat(raw.area),
      rooms: safeInt(raw.rooms),
      bathrooms: safeInt(raw.bathrooms),
      floor: raw.floor !== undefined && raw.floor !== null ? safeInt(raw.floor) : null,
      total_floors: raw.total_floors !== undefined && raw.total_floors !== null ? safeInt(raw.total_floors) : null,
      description: safeStr(raw.description),
      governorate: safeStr(raw.governorate),
      city: safeStr(raw.city),
      region: safeStr(raw.region),
      status: 'pending',
      features: {
        create: buildFeaturesCreate(raw.features),
      },
    };

    if (safeMedia.length > 0) {
      data.media = {
        create: safeMedia.map((m: any) => ({
          media_url: safeStr(m?.media_url),
          media_type: safeStr(m?.media_type, 'image'),
          is_primary: safeBool(m?.is_primary),
        })),
      };
    }

    const newProperty = await prisma.property.create({
      data,
      include: {
        media: true,
        features: true,
        owner: { select: { id: true, full_name: true, phone: true } },
      },
    });

    return res.status(201).json({ message: 'تم إضافة العقار بنجاح', property: newProperty });
  } catch (error: any) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server Error', error: error?.message || String(error) });
  }
});

// Get all Properties (public list - only show approved/active ones)
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, type, owner_id, admin_view } = req.query;
    
    const where: any = {};
    
    // Admin view - show all statuses regardless
    const isAdminView = admin_view === 'true' || admin_view === '1';
    
    if (isAdminView) {
      // Admin: show all, allow filtering by status
      if (status) where.status = status;
    } else if (owner_id) {
      // Owner viewing their own ads - show all statuses
      where.owner_id = Number(owner_id);
      if (status) where.status = status;
    } else {
      // Public list - only show active, sold, rented (hide pending, rejected)
      if (status) {
        where.status = status;
      } else {
        where.status = { in: ['active', 'sold', 'rented'] };
      }
    }
    
    if (type) where.type = type;

    const properties = await prisma.property.findMany({
      where,
      include: {
        media: true,
        owner: { select: { id: true, full_name: true, is_verified: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.json(properties);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Get single Property by ID
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const propertyId = parseInt(req.params.id as string);
    if (isNaN(propertyId)) return res.status(400).json({ message: 'Invalid ID' });

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        media: true,
        features: true,
        owner: { select: { id: true, full_name: true, is_verified: true, phone: true } },
      }
    });

    if (!property) return res.status(404).json({ message: 'Property not found' });

    return res.json(property);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Record a View
router.post('/:id/view', async (req: Request, res: Response): Promise<any> => {
  try {
    const propertyId = parseInt(req.params.id as string);
    if (isNaN(propertyId)) return res.status(400).json({ message: 'Invalid ID' });
    return res.json({ message: 'View recorded' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Toggle Favorite
router.post('/:id/favorite', async (req: Request, res: Response): Promise<any> => {
  try {
    const propertyId = parseInt(req.params.id as string);
    const { user_id } = req.body; // In real app, get from auth middleware token

    if (!user_id || !propertyId) {
      return res.status(400).json({ message: 'Missing user_id or property id' });
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        user_id_property_id: { user_id, property_id: propertyId }
      }
    });

    if (existingFavorite) {
      await prisma.favorite.delete({
        where: { id: existingFavorite.id }
      });
      return res.json({ message: 'Removed from favorites', isFavorite: false });
    } else {
      await prisma.favorite.create({
        data: { user_id, property_id: propertyId }
      });
      return res.json({ message: 'Added to favorites', isFavorite: true });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Update Property Status (Sold/Rented/Active/Rejected)
router.put('/:id/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const propertyId = parseInt(req.params.id as string);
    const { status, rejection_reason } = req.body;

    const validStatuses = ['sold', 'rented', 'active', 'pending', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const data: any = { status };
    // Save rejection reason only when rejecting; clear it when approving/activating
    if (status === 'rejected') {
      data.rejection_reason = rejection_reason || 'لا يوجد سبب مذكور';
    } else if (status === 'active' || status === 'sold' || status === 'rented') {
      data.rejection_reason = null;
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data
    });

    return res.json({ message: `Property status updated to ${status}`, property: updatedProperty });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Update Property (PUT - full update by owner)
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const propertyId = safeInt(req.params.id, NaN);
    if (isNaN(propertyId)) return res.status(400).json({ message: 'Invalid ID' });

    const raw = req.body || {};
    const {
      type, operation_type, price, area, rooms, bathrooms,
      description, governorate, city, region, features, media
    } = raw;

    const data: any = {
      status: 'pending',
      rejection_reason: null
    };
    if (type !== undefined) data.type = safeStr(type);
    if (operation_type !== undefined) data.operation_type = safeStr(operation_type, 'sale');
    if (price !== undefined) data.price = safeFloat(price);
    if (area !== undefined) data.area = safeFloat(area);
    if (rooms !== undefined) data.rooms = safeInt(rooms);
    if (bathrooms !== undefined) data.bathrooms = safeInt(bathrooms);
    if (raw.floor !== undefined) data.floor = raw.floor === null ? null : safeInt(raw.floor);
    if (raw.total_floors !== undefined) data.total_floors = raw.total_floors === null ? null : safeInt(raw.total_floors);
    if (description !== undefined) data.description = safeStr(description);
    if (governorate !== undefined) data.governorate = safeStr(governorate);
    if (city !== undefined) data.city = safeStr(city);
    if (region !== undefined) data.region = safeStr(region);

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data,
    });

    if (features !== undefined) {
      const fc = buildFeaturesCreate(features);
      await prisma.propertyFeature.upsert({
        where: { property_id: propertyId },
        update: fc,
        create: { property_id: propertyId, ...fc },
      });
    }

    const safeMedia = Array.isArray(media) ? media : [];
    if (safeMedia.length > 0) {
      await prisma.propertyMedia.deleteMany({ where: { property_id: propertyId } });
      await prisma.propertyMedia.createMany({
        data: safeMedia.map((m: any) => ({
          property_id: propertyId,
          media_url: safeStr(m?.media_url),
          media_type: safeStr(m?.media_type, 'image'),
          is_primary: safeBool(m?.is_primary),
        })),
      });
    }

    return res.json({ message: 'تم تحديث العقار بنجاح', property: updatedProperty });
  } catch (error: any) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server Error', error: error?.message || String(error) });
  }
});

// Report Property
router.post('/:id/report', async (req: Request, res: Response): Promise<any> => {
  try {
    const propertyId = parseInt(req.params.id as string);
    const { reporter_id, reason } = req.body;

    if (!reporter_id || !reason) {
      return res.status(400).json({ message: 'Missing reporter_id or reason' });
    }

    const report = await prisma.report.create({
      data: {
        reporter_id,
        property_id: propertyId,
        reason
      }
    });

    return res.json({ message: 'تم إرسال البلاغ بنجاح', report });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

export default router;
