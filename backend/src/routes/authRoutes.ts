import { Router } from 'express';
import { register, login, sendOtp, verifyOtp, googleLogin } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleLogin);

export default router;
