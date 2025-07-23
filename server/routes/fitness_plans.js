import express from 'express';
const router = express.Router();

// List
router.get('/', async (req, res) => {
    await req.db.read();
    res.json(req.db.data.fitness_plans);
});

// Create
router.post('/', async (req, res) => {
    const newItem = { ...req.body, id: Date.now() };
    req.db.data.fitness_plans.push(newItem);
    await req.db.write();
    res.status(201).json(newItem);
});

// Generate personalized fitness plan
router.post('/generate', async (req, res) => {
    try {
        const { userDetails, onboardingResponses } = req.body;
        
        // Generate a personalized fitness plan based on user responses
        const fitnessPlan = generatePersonalizedPlan(userDetails, onboardingResponses);
        
        // Save the generated plan to the database
        const planWithId = { ...fitnessPlan, id: Date.now() };
        req.db.data.fitness_plans.push(planWithId);
        await req.db.write();
        
        res.status(201).json(fitnessPlan);
    } catch (error) {
        console.error('Error generating fitness plan:', error);
        res.status(500).json({ error: 'Failed to generate fitness plan' });
    }
});

// Delete
router.delete('/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    req.db.data.fitness_plans = req.db.data.fitness_plans.filter(item => item.id !== id);
    await req.db.write();
    res.status(204).send();
});

// Helper function to generate personalized fitness plan
function generatePersonalizedPlan(userDetails, onboardingResponses) {
    const { fitness_goal, plan_duration, preferred_activities, avoided_activities, health_conditions, experience_level } = onboardingResponses;
    
    // Base plan structure
    const plan = {
        plan_name: `${fitness_goal.replace('_', ' ').toUpperCase()} - ${plan_duration.replace('_', ' ').toUpperCase()} PLAN`,
        goal: fitness_goal,
        duration: plan_duration,
        experience_level: experience_level,
        health_considerations: health_conditions,
        created_for: userDetails.name,
        created_at: new Date().toISOString(),
        workouts: generateWorkouts(fitness_goal, plan_duration, preferred_activities, avoided_activities, experience_level),
        recommendations: generateRecommendations(fitness_goal, health_conditions, experience_level)
    };
    
    return plan;
}

function generateWorkouts(goal, duration, preferred, avoided, experience) {
    const workouts = [];
    const daysPerWeek = duration === '1_week' ? 3 : duration === '2_weeks' ? 4 : 5;
    
    // Define workout templates based on goals
    const workoutTemplates = {
        weight_loss: {
            cardio: ['Running', 'Cycling', 'Swimming', 'Rowing'],
            strength: ['Bodyweight Squats', 'Push-ups', 'Planks', 'Lunges'],
            hiit: ['Burpees', 'Mountain Climbers', 'Jump Squats', 'High Knees']
        },
        muscle_gain: {
            strength: ['Bench Press', 'Squats', 'Deadlifts', 'Pull-ups'],
            hypertrophy: ['Dumbbell Rows', 'Shoulder Press', 'Leg Press', 'Bicep Curls'],
            accessory: ['Lateral Raises', 'Tricep Dips', 'Calf Raises', 'Core Work']
        },
        endurance: {
            cardio: ['Long Distance Running', 'Cycling', 'Swimming', 'Rowing'],
            intervals: ['Sprint Intervals', 'Hill Training', 'Tempo Runs', 'Fartlek Training']
        },
        flexibility: {
            stretching: ['Static Stretches', 'Dynamic Stretches', 'Yoga Poses', 'Mobility Work'],
            yoga: ['Sun Salutations', 'Warrior Poses', 'Balance Poses', 'Restorative Poses']
        },
        general_fitness: {
            mixed: ['Circuit Training', 'Functional Movements', 'Bodyweight Exercises', 'Light Cardio']
        }
    };
    
    const template = workoutTemplates[goal] || workoutTemplates.general_fitness;
    
    for (let week = 1; week <= (duration === '1_week' ? 1 : duration === '2_weeks' ? 2 : 4); week++) {
        for (let day = 1; day <= daysPerWeek; day++) {
            const workout = {
                week: week,
                day: day,
                name: `${goal.replace('_', ' ').toUpperCase()} - Day ${day}`,
                exercises: generateExercises(template, preferred, avoided, experience),
                duration: experience === 'beginner' ? '30-45 minutes' : experience === 'intermediate' ? '45-60 minutes' : '60-75 minutes',
                intensity: experience === 'beginner' ? 'Low to Moderate' : experience === 'intermediate' ? 'Moderate' : 'Moderate to High'
            };
            workouts.push(workout);
        }
    }
    
    return workouts;
}

function generateExercises(template, preferred, avoided, experience) {
    const exercises = [];
    const exerciseCount = experience === 'beginner' ? 4 : experience === 'intermediate' ? 6 : 8;
    
    // Filter exercises based on preferences and restrictions
    let availableExercises = [];
    Object.values(template).forEach(category => {
        availableExercises = availableExercises.concat(category);
    });
    
    // Remove avoided exercises
    if (avoided && avoided.length > 0) {
        availableExercises = availableExercises.filter(exercise => {
            return !avoided.some(avoidedType => {
                if (avoidedType === 'high_impact') {
                    return ['Running', 'Jump Squats', 'Burpees', 'High Knees'].includes(exercise);
                }
                if (avoidedType === 'heavy_lifting') {
                    return ['Bench Press', 'Deadlifts', 'Squats'].includes(exercise);
                }
                if (avoidedType === 'complex_movements') {
                    return ['Deadlifts', 'Pull-ups', 'Burpees'].includes(exercise);
                }
                return false;
            });
        });
    }
    
    // Select random exercises
    for (let i = 0; i < Math.min(exerciseCount, availableExercises.length); i++) {
        const randomIndex = Math.floor(Math.random() * availableExercises.length);
        exercises.push({
            name: availableExercises[randomIndex],
            sets: experience === 'beginner' ? 2 : experience === 'intermediate' ? 3 : 4,
            reps: experience === 'beginner' ? '8-12' : experience === 'intermediate' ? '10-15' : '12-20',
            rest: experience === 'beginner' ? '90 seconds' : experience === 'intermediate' ? '60 seconds' : '45 seconds'
        });
        availableExercises.splice(randomIndex, 1);
    }
    
    return exercises;
}

function generateRecommendations(goal, healthConditions, experience) {
    const recommendations = [];
    
    // Goal-specific recommendations
    if (goal === 'weight_loss') {
        recommendations.push('Focus on creating a caloric deficit through diet and exercise');
        recommendations.push('Include both cardio and strength training for optimal results');
        recommendations.push('Aim for 150-300 minutes of moderate activity per week');
    } else if (goal === 'muscle_gain') {
        recommendations.push('Ensure adequate protein intake (1.6-2.2g per kg body weight)');
        recommendations.push('Progressive overload is key - gradually increase weight or reps');
        recommendations.push('Allow 48-72 hours rest between training the same muscle group');
    } else if (goal === 'endurance') {
        recommendations.push('Gradually increase duration and intensity of cardio sessions');
        recommendations.push('Include both steady-state and interval training');
        recommendations.push('Focus on proper breathing techniques during exercise');
    }
    
    // Experience-specific recommendations
    if (experience === 'beginner') {
        recommendations.push('Start slowly and focus on proper form');
        recommendations.push('Listen to your body and don\'t push through pain');
        recommendations.push('Consider working with a trainer for initial guidance');
    } else if (experience === 'intermediate') {
        recommendations.push('Vary your routine to prevent plateaus');
        recommendations.push('Consider periodization in your training');
        recommendations.push('Track your progress to stay motivated');
    } else {
        recommendations.push('Focus on advanced techniques and periodization');
        recommendations.push('Consider sport-specific training if applicable');
        recommendations.push('Pay attention to recovery and injury prevention');
    }
    
    // Health condition recommendations
    if (healthConditions && healthConditions !== 'none') {
        if (healthConditions === 'back_pain') {
            recommendations.push('Avoid exercises that aggravate back pain');
            recommendations.push('Focus on core strengthening and proper posture');
            recommendations.push('Consider low-impact alternatives to high-impact exercises');
        } else if (healthConditions === 'knee_problems') {
            recommendations.push('Avoid high-impact exercises that stress the knees');
            recommendations.push('Focus on strengthening surrounding muscles');
            recommendations.push('Consider swimming or cycling for cardio');
        } else if (healthConditions === 'heart_condition') {
            recommendations.push('Consult with your doctor before starting any exercise program');
            recommendations.push('Start with low-intensity activities');
            recommendations.push('Monitor your heart rate during exercise');
        }
    }
    
    return recommendations;
}

export default router;
