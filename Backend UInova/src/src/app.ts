import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { apiLimiter } from './middlewares/security';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import pageRoutes from './routes/pages';
import exportRoutes from './routes/exports';
import paymentRoutes from './routes/payments';
import badgeRoutes from './routes/badges';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import aiRoutes from './routes/ai';
import { setupSwagger } from './utils/swagger';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Sécurité & middlewares globaux
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(apiLimiter);

// Routes de l’API
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/uploads', express.static('uploads'));

// Documentation Swagger
setupSwagger(app);

// Gestion des erreurs
app.use(errorHandler);

export default app;
