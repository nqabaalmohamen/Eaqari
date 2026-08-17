import { Router } from 'express';
import { completeProfile } from '../controllers/userController';

const router = Router();

router.put('/profile-completion', completeProfile);

export default router;
