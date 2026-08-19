import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import propertyRoutes from './routes/propertyRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import notificationRoutes from './routes/notificationRoutes';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>عقاري API</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background-color: #f8fafc; color: #1e293b; direction: rtl; }
          h1 { color: #2563eb; }
          p { font-size: 1.2rem; }
        </style>
      </head>
      <body>
        <h1>🚀 الخادم يعمل بنجاح</h1>
        <p>مرحباً بك في الخادم الخاص بتطبيق عقاري.</p>
        <p>هذا الرابط مخصص لواجهة برمجة التطبيقات (API) الخاصة بالتطبيق.</p>
      </body>
    </html>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Eaqari API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

export default app;

