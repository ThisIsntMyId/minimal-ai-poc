import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { JSONFilePreset } from 'lowdb/node';

import appointmentsRouter from './routes/appointments.js';
import prescriptionsRouter from './routes/prescriptions.js';
import fitnessPlansRouter from './routes/fitness_plans.js';
import mealPlansRouter from './routes/meal_plans.js';

const app = express();
app.use(express.json());
app.use(cors());

// Get the directory name of the current module
const __dirname = path.dirname(new URL(import.meta.url).pathname.substring(1));

// Serve static files from the 'public' directory which is now at the root
app.use(express.static(path.join(__dirname, '..', 'public')));

const db = await JSONFilePreset('db.json', {
    appointments: [],
    prescriptions: [],
    fitness_plans: [],
    meal_plans: []
});

// Make db available to routes
app.use((req, res, next) => {
    req.db = db;
    next();
});

app.use('/api/appointments', appointmentsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/fitness_plans', fitnessPlansRouter);
app.use('/api/meal_plans', mealPlansRouter);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});