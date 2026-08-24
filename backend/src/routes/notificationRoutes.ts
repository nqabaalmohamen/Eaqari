import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

// Get user notifications
router.get('/user/:userId', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = parseInt(req.params.userId as string);
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });
    res.json({ notifications });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin send notification
router.post('/admin/send', async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, message, user_id } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    if (user_id === 'all') {
      // Broadcast to all users
      const users = await prisma.user.findMany({ select: { id: true } });
      const notifications = users.map(u => ({
        user_id: u.id,
        title,
        message
      }));
      await prisma.notification.createMany({ data: notifications });
      return res.json({ message: `Sent to ${users.length} users` });
    } else {
      // Send to specific user
      const targetId = parseInt(user_id);
      if (isNaN(targetId)) return res.status(400).json({ message: 'Invalid user_id' });
      
      const notification = await prisma.notification.create({
        data: {
          user_id: targetId,
          title,
          message
        }
      });
      return res.json({ message: 'Notification sent', notification });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all notifications as read for a user
router.put('/user/:userId/read-all', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = parseInt(req.params.userId as string);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true }
    });
    res.json({ message: 'Notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
