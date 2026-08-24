import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

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

// Create Admin Chat
router.post('/create-admin', async (req: Request, res: Response): Promise<any> => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: 'Missing user_id' });

    const userIdInt = parseInt(user_id as any);
    if (isNaN(userIdInt)) return res.status(400).json({ message: 'Invalid user_id' });

    // Find first admin
    const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
    const admin = await prisma.user.findFirst({
      where: { role_id: adminRole?.id || 1 },
      orderBy: { id: 'asc' }
    });

    if (!admin) return res.status(404).json({ message: 'No admin found' });

    let conversation: any = await prisma.conversation.findFirst({
      where: { buyer_id: userIdInt, owner_id: admin.id } as any,
      include: {
        buyer: { select: { id: true, full_name: true, phone: true } },
        owner: { select: { id: true, full_name: true, phone: true } },
        messages: { orderBy: { created_at: 'asc' } }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { buyer_id: userIdInt, owner_id: admin.id } as any,
        include: {
          buyer: { select: { id: true, full_name: true, phone: true } },
          owner: { select: { id: true, full_name: true, phone: true } },
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
