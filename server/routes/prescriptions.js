import express from 'express';
const router = express.Router();

// List
router.get('/', async (req, res) => {
    await req.db.read();
    res.json(req.db.data.prescriptions);
});

// Create
router.post('/', async (req, res) => {
    const newItem = { ...req.body, id: Date.now() };
    req.db.data.prescriptions.push(newItem);
    await req.db.write();
    res.status(201).json(newItem);
});

// Delete
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    req.db.data.prescriptions = req.db.data.prescriptions.filter(item => item.id !== id);
    await req.db.write();
    res.status(204).send();
});

export default router;
