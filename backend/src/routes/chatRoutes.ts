import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

// =========================================
// Create Admin Chat (أول route لتجنب مشاكل التسجيل)
// =========================================
async function findAdminUser(): Promise<any> {
  let adminRoleId: number | null = null;

  try {
    const r1 = await prisma.role.findFirst({
      where: { name: 'admin' },
    });
    if (r1) adminRoleId = r1.id;
  } catch (e: any) {
    console.warn('[findAdmin] exact role lookup failed:', e?.message);
  }

  if (!adminRoleId) {
    try {
      const r2: any[] = await prisma.$queryRawUnsafe(
        "SELECT id, name FROM \"Role\" WHERE LOWER(name) = LOWER('admin') LIMIT 1"
      ) as any;
      if (r2 && r2.length > 0) adminRoleId = r2[0].id;
    } catch (e: any) {
      console.warn('[findAdmin] raw role lookup failed:', e?.message);
    }
  }

  if (!adminRoleId) {
    try {
      const r3: any[] = await prisma.$queryRawUnsafe(
        "SELECT id, name FROM \"Role\" WHERE LOWER(name) LIKE LOWER('%admin%') ORDER BY id ASC LIMIT 1"
      ) as any;
      if (r3 && r3.length > 0) {
        adminRoleId = r3[0].id;
        console.log('[findAdmin] ✅ Found admin-like role via LIKE:', r3[0].name, '→ id', adminRoleId);
      }
    } catch (e: any) {
      console.warn('[findAdmin] LIKE admin role lookup failed:', e?.message);
    }
  }

  if (!adminRoleId) {
    try {
      const allRoles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
      const likeMatch = (allRoles || []).find(r =>
        typeof r.name === 'string' && r.name.toLowerCase().includes('admin')
      );
      if (likeMatch) adminRoleId = likeMatch.id;
      else if (allRoles && allRoles.length > 0) adminRoleId = allRoles[allRoles.length - 1].id;
    } catch { /* ignore */ }
  }

  const fallbackIds = adminRoleId ? [adminRoleId] : [2, 3, 1];

  for (const rid of fallbackIds) {
    try {
      const u = await prisma.user.findFirst({
        where: { role_id: rid },
        orderBy: { id: 'asc' },
        select: { id: true, full_name: true, phone: true, email: true, role_id: true },
      });
      if (u) {
        console.log('[findAdmin] ✅ Found admin user via role_id:', rid, 'user:', { id: u.id, name: u.full_name, email: u.email });
        return u;
      }
    } catch (e: any) {
      console.warn('[findAdmin] user findFirst for role_id', rid, 'failed:', e?.message);
    }
  }

  try {
    const rawUsers: any[] = await prisma.$queryRawUnsafe(
      'SELECT u.id, u.full_name, u.phone, u.email, u.role_id FROM "User" u ORDER BY u.id ASC'
    ) as any;
    if (rawUsers && rawUsers.length > 0) {
      let candidate: any = rawUsers.find((u: any) =>
        (u.email && u.email.toLowerCase().includes('admin')) ||
        u.role_id === adminRoleId
      );
      if (!candidate) candidate = rawUsers[rawUsers.length - 1];
      if (!candidate) candidate = rawUsers[0];
      console.log('[findAdmin] ✅ Raw fallback admin user:', candidate);
      return candidate;
    }
  } catch (e: any) {
    console.warn('[findAdmin] raw user lookup also failed:', e?.message);
  }

  return null;
}

async function getOrCreateConversation(userIdInt: number, adminId: number): Promise<any> {
  const selectBase = {
    id: true,
    buyer_id: true,
    owner_id: true,
    property_id: true,
    created_at: true,
  };

  let conversation: any = null;

  try {
    conversation = await prisma.conversation.findFirst({
      where: { buyer_id: userIdInt, owner_id: adminId },
      select: selectBase,
      orderBy: { id: 'desc' },
    });
  } catch (e: any) {
    console.warn('[getOrCreateConv] findFirst (select) failed:', e?.message);
    try {
      const raw: any[] = await prisma.$queryRawUnsafe(
        'SELECT id, buyer_id, owner_id, property_id, created_at FROM "Conversation" WHERE buyer_id = $1 AND owner_id = $2 ORDER BY id DESC LIMIT 1',
        userIdInt, adminId
      ) as any;
      if (raw && raw.length > 0) conversation = raw[0];
    } catch (rawErr: any) {
      console.warn('[getOrCreateConv] raw findFirst also failed:', rawErr?.message);
    }
  }

  if (conversation) {
    console.log('[getOrCreateConv] ✅ Existing conversation id:', conversation.id);
  } else {
    console.log('[getOrCreateConv] 🆕 Creating conversation...');
    try {
      conversation = await prisma.conversation.create({
        data: { buyer_id: userIdInt, owner_id: adminId },
        select: selectBase,
      });
      console.log('[getOrCreateConv] ✅ Created conversation id:', conversation.id);
    } catch (e: any) {
      console.warn('[getOrCreateConv] prisma.create failed:', e?.message);
      try {
        const raw: any[] = await prisma.$queryRawUnsafe(
          'INSERT INTO "Conversation" (buyer_id, owner_id, created_at) VALUES ($1, $2, NOW()) RETURNING id, buyer_id, owner_id, property_id, created_at',
          userIdInt, adminId
        ) as any;
        if (raw && raw.length > 0) {
          conversation = raw[0];
          console.log('[getOrCreateConv] ✅ Raw create success id:', conversation.id);
        }
      } catch (rawErr: any) {
        console.error('[getOrCreateConv] raw create also failed:', rawErr?.message);
        throw rawErr || e;
      }
    }
  }

  const cid = conversation.id;

  let buyer: any = null;
  let owner: any = null;
  let messages: any[] = [];

  try {
    [buyer, owner, messages] = await Promise.all([
      prisma.user.findUnique({ where: { id: userIdInt }, select: { id: true, full_name: true, phone: true } }),
      prisma.user.findUnique({ where: { id: adminId }, select: { id: true, full_name: true, phone: true } }),
      prisma.message.findMany({ where: { conversation_id: cid }, orderBy: { created_at: 'asc' }, include: { sender: { select: { id: true, full_name: true } } } }),
    ]);
  } catch (relErr: any) {
    console.warn('[getOrCreateConv] includes fetch failed, using raw:', relErr?.message);
    try {
      const buyerRaw: any[] = await prisma.$queryRawUnsafe(
        'SELECT id, full_name, phone FROM "User" WHERE id = $1 LIMIT 1', userIdInt
      ) as any;
      const ownerRaw: any[] = await prisma.$queryRawUnsafe(
        'SELECT id, full_name, phone FROM "User" WHERE id = $1 LIMIT 1', adminId
      ) as any;
      const msgRaw: any[] = await prisma.$queryRawUnsafe(
        'SELECT m.*, u.id as sender_id, u.full_name as sender_full_name FROM "Message" m LEFT JOIN "User" u ON u.id = m.sender_id WHERE m.conversation_id = $1 ORDER BY m.created_at ASC', cid
      ) as any;
      buyer = buyerRaw?.[0] || null;
      owner = ownerRaw?.[0] || null;
      messages = (msgRaw || []).map((m: any) => ({
        id: m.id, conversation_id: m.conversation_id, sender_id: m.sender_id,
        content: m.content, is_read: m.is_read, created_at: m.created_at,
        sender: m.sender_id ? { id: m.sender_id, full_name: m.sender_full_name } : null,
      }));
    } catch (rawRelErr: any) {
      console.warn('[getOrCreateConv] raw includes also failed:', rawRelErr?.message);
    }
  }

  return {
    ...conversation,
    buyer,
    owner,
    messages,
  };
}

async function createAdminChatHandler(req: Request, res: Response): Promise<any> {
  try {
    console.log('[create-admin] 📥 Received request. Body:', JSON.stringify(req.body));
    const { user_id } = req.body;
    if (!user_id) {
      console.log('[create-admin] ❌ Missing user_id');
      return res.status(400).json({ message: 'Missing user_id' });
    }

    const userIdInt = parseInt(String(user_id));
    if (isNaN(userIdInt)) {
      console.log('[create-admin] ❌ Invalid user_id:', user_id);
      return res.status(400).json({ message: 'Invalid user_id' });
    }

    console.log('[create-admin] 🔎 Resolving admin user...');
    const admin = await findAdminUser();
    if (!admin) {
      console.log('[create-admin] ❌ No admin user could be resolved');
      return res.status(404).json({ message: 'No admin found' });
    }

    const adminId = admin.id;
    console.log('[create-admin] 🔎 Resolving conversation between user', userIdInt, 'and admin', adminId);
    const conversation = await getOrCreateConversation(userIdInt, adminId);

    return res.json({ conversation });
  } catch (error: any) {
    console.error('[create-admin] 🔥 FULL ERROR:', error);
    res.status(500).json({
      message: 'Server Error',
      error: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });
  }
}

// نعلن عنه بكل الطرق لضمان التسجيل
router.post('/create-admin', createAdminChatHandler);
router.post('/createAdmin', createAdminChatHandler);
router.all('/admin-chat-create', createAdminChatHandler);

// Get or create conversation between buyer and owner for a property
router.post('/create', async (req: Request, res: Response): Promise<any> => {
  try {
    const { buyer_id, owner_id, property_id } = req.body;

    if (!buyer_id || !owner_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const pId = property_id ? parseInt(property_id) : null;

    // Find existing conversation
    let conversation: any = await prisma.conversation.findFirst({
      where: { buyer_id, owner_id, property_id: pId ?? undefined } as any,
      include: {
        buyer: { select: { id: true, full_name: true, phone: true } },
        owner: { select: { id: true, full_name: true, phone: true } },
        property: { select: { id: true, description: true, city: true, type: true } },
        messages: { orderBy: { created_at: 'asc' } }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { buyer_id, owner_id, property_id: (pId ?? undefined) as any } as any,
        include: {
          buyer: { select: { id: true, full_name: true, phone: true } },
          owner: { select: { id: true, full_name: true, phone: true } },
          property: { select: { id: true, description: true, city: true, type: true } },
          messages: { orderBy: { created_at: 'asc' } }
        }
      });
    }

    return res.json({ conversation });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Get all conversations for a user (as buyer OR owner)
router.get('/user/:userId', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = parseInt(req.params.userId as string);

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyer_id: userId }, { owner_id: userId }]
      },
      include: {
        buyer: { select: { id: true, full_name: true, phone: true } },
        owner: { select: { id: true, full_name: true, phone: true } },
        property: { select: { id: true, city: true, type: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1  // Only last message
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.json({ conversations });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Get single conversation by ID
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const conversationId = parseInt(req.params.id as string);
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        buyer: { select: { id: true, full_name: true, phone: true } },
        owner: { select: { id: true, full_name: true, phone: true } },
        property: { select: { id: true, city: true, type: true } }
      }
    });
    if (!conversation) return res.status(404).json({ message: 'Not found' });
    return res.json({ conversation });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Get messages in a conversation
router.get('/:id/messages', async (req: Request, res: Response): Promise<any> => {
  try {
    const conversationId = parseInt(req.params.id as string);

    const messages = await prisma.message.findMany({
      where: { conversation_id: conversationId },
      include: {
        sender: { select: { id: true, full_name: true } }
      },
      orderBy: { created_at: 'asc' }
    });

    return res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Send a message
router.post('/:id/messages', async (req: Request, res: Response): Promise<any> => {
  try {
    const conversationId = parseInt(req.params.id as string);
    const { sender_id, content } = req.body;

    if (!sender_id || !content) {
      return res.status(400).json({ message: 'Missing sender_id or content' });
    }

    const message = await prisma.message.create({
      data: { conversation_id: conversationId, sender_id, content },
      include: { sender: { select: { id: true, full_name: true } } }
    });

    // Send notification to the OTHER person in the conversation
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          buyer: { select: { id: true, full_name: true } },
          owner: { select: { id: true, full_name: true } },
          property: { select: { type: true, city: true } }
        }
      });
      // Removed general notification creation for chat messages
      // We rely on BottomNav pulling unread message counts instead
    } catch (notifErr) {
      // Don't fail the message send if notification fails
      console.error('Notification error:', notifErr);
    }

    return res.json({ message });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Report a conversation
router.post('/:id/report', async (req: Request, res: Response): Promise<any> => {
  try {
    const { reporter_id, reason } = req.body;
    const conversationId = parseInt(req.params.id as string);

    if (!reporter_id || !reason) {
      return res.status(400).json({ message: 'Missing reporter_id or reason' });
    }

    // Get conversation to find the reported user
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const reportedUserId = conversation.buyer_id === reporter_id
      ? conversation.owner_id
      : conversation.buyer_id;

    const report = await prisma.report.create({
      data: {
        reporter_id,
        reported_user_id: reportedUserId,
        reason: `محادثة #${conversationId}: ${reason}`
      }
    });

    return res.json({ message: 'تم إرسال البلاغ بنجاح', report });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Get unread message count for a user
router.get('/unread/:userId', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = parseInt(String(req.params.userId));
    if (isNaN(userId)) return res.status(400).json({ message: 'Invalid User ID' });

    const unreadCount = await prisma.message.count({
      where: {
        is_read: false,
        sender_id: { not: userId }, // From others
        conversation: {
          OR: [
            { buyer_id: userId },
            { owner_id: userId }
          ]
        }
      }
    });

    return res.json({ unread_count: unreadCount });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Mark all messages in a conversation as read by a user
router.post('/:id/read', async (req: Request, res: Response): Promise<any> => {
  try {
    const conversationId = parseInt(String(req.params.id));
    const { user_id } = req.body;
    if (isNaN(conversationId) || !user_id) return res.status(400).json({ message: 'Invalid request' });

    await prisma.message.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: user_id },
        is_read: false
      },
      data: { is_read: true }
    });

    return res.json({ message: 'Messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Admin: get all conversations
router.get('/admin/all', async (req: Request, res: Response): Promise<any> => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        buyer: { select: { id: true, full_name: true, email: true, phone: true } },
        owner: { select: { id: true, full_name: true, email: true, phone: true } },
        property: { select: { id: true, city: true, type: true } },
        messages: { orderBy: { created_at: 'desc' }, take: 1 }
      },
      orderBy: { created_at: 'desc' }
    });
    return res.json({ conversations });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

export default router;
