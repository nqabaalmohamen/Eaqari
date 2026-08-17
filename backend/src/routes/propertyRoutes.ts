import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

function normalizeMeterType(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'قانوني' || s === 'legal') return 'legal';
  if (s === 'كودي' || s === 'ممارسة' || s === 'codi') return 'codi';
  return s || null;
}

function buildOtherFeatures(features: any): any {
  if (!features || typeof features !== 'object') return {};
  const safe: any = {};
  for (const [k, v] of Object.entries(features)) {
    if (k === 'has_elevator' || k === 'has_parking' || k === 'is_licensed' || k === 'meter_type') continue;
    if (v === undefined) continue;
    safe[k] = v;
  }
  return safe;
}

// Create Property
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      owner_id, type, operation_type, price, area, rooms, bathrooms,
      description, governorate, city, region, features, media
    } = req.body;

    const safeOwnerId = parseInt(owner_id);
    if (!safeOwnerId || !type || price === undefined || price === null || area === undefined || area === null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const safeMedia = Array.isArray(media) ? media : [];

    const data: any = {
      owner_id: safeOwnerId,
      type,
      operation_type: operation_type || 'sale',
      price: parseFloat(price) || 0,
      area: parseFloat(area) || 0,
      rooms: parseInt(rooms) || 0,
      bathrooms: parseInt(bathrooms) || 0,
      description: description || '',
      governorate: governorate || '',
      city: city || '',
      region: region || '',
      status: 'pending',
    };

    if (features && typeof features === 'object') {
      data.features = {
        create: {
          has_elevator: features.has_elevator === true ? true : false,
          has_parking: features.has_parking === true ? true : false,
          is_licensed: features.is_licensed === true ? true : false,
          meter_type: normalizeMeterType(features.meter_type || features.electricity_meter_type),
          other_features: buildOtherFeatures(features),
        }
      };
    }

    if (safeMedia.length > 0) {
      data.media = {
        create: safeMedia.map((m: any) => ({
          media_url: String(m.media_url || ''),
          media_type: String(m.media_type || 'image'),
          is_primary: m.is_primary === true ? true : false,
        }))
      };
    }

    const newProperty = await prisma.property.create({
      data,
      include: {
        media: true,
        features: true,
        owner: { select: { id: true, full_name: true, phone: true } }
      }
    });

    return res.status(201).json({ message: 'تم إضافة العقار بنجاح', property: newProperty });
  } catch (error: any) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
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
        owner: { select: { id: true, full_name: true, is_verified: true, phone: true } }
      }
    });

    if (!property) return res.status(404).json({ message: 'Property not found' });

    return res.json(property);
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
    const propertyId = parseInt(req.params.id as string);
    if (isNaN(propertyId)) return res.status(400).json({ message: 'Invalid ID' });

    const {
      type, operation_type, price, area, rooms, bathrooms,
      description, governorate, city, region, features, media
    } = req.body;

    // Update property fields with safe values
    const data: any = {};
    if (type !== undefined) data.type = type;
    if (operation_type !== undefined) data.operation_type = operation_type;
    if (price !== undefined) data.price = parseFloat(price) || 0;
    if (area !== undefined) data.area = parseFloat(area) || 0;
    if (rooms !== undefined) data.rooms = parseInt(rooms) || 0;
    if (bathrooms !== undefined) data.bathrooms = parseInt(bathrooms) || 0;
    if (description !== undefined) data.description = description || '';
    if (governorate !== undefined) data.governorate = governorate || '';
    if (city !== undefined) data.city = city || '';
    if (region !== undefined) data.region = region || '';

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data
    });

    // Update features if provided
    if (features && typeof features === 'object') {
      await prisma.propertyFeature.upsert({
        where: { property_id: propertyId },
        update: {
          has_elevator: features.has_elevator === true ? true : false,
          has_parking: features.has_parking === true ? true : false,
          is_licensed: features.is_licensed === true ? true : false,
          meter_type: normalizeMeterType(features.meter_type || features.electricity_meter_type),
          other_features: buildOtherFeatures(features),
        },
        create: {
          property_id: propertyId,
          has_elevator: features.has_elevator === true ? true : false,
          has_parking: features.has_parking === true ? true : false,
          is_licensed: features.is_licensed === true ? true : false,
          meter_type: normalizeMeterType(features.meter_type || features.electricity_meter_type),
          other_features: buildOtherFeatures(features),
        }
      });
    }

    // Replace media if new media provided
    const safeMedia = Array.isArray(media) ? media : [];
    if (safeMedia.length > 0) {
      await prisma.propertyMedia.deleteMany({ where: { property_id: propertyId } });
      await prisma.propertyMedia.createMany({
        data: safeMedia.map((m: any) => ({
          property_id: propertyId,
          media_url: String(m.media_url || ''),
          media_type: String(m.media_type || 'image'),
          is_primary: m.is_primary === true ? true : false,
        }))
      });
    }

    return res.json({ message: 'تم تحديث العقار بنجاح', property: updatedProperty });
  } catch (error: any) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
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
