import { Router } from 'express';
import { register, login, sendOtp, verifyOtp, googleLogin, requestPasswordResetEmail, resetPassword, requestAdminReset } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleLogin);

router.post('/forgot-password/request-email', requestPasswordResetEmail);
router.post('/forgot-password/reset', resetPassword);
router.post('/forgot-password/admin-request', requestAdminReset);

export default router;
