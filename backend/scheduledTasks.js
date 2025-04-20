const cron = require('node-cron');
const Policy = require('./models/Policy');

// Initialize scheduled tasks
const initScheduledTasks = () => {
    console.log('Initializing scheduled tasks...');
    
    // Schedule task to run at midnight every day
    // Check and update policy status
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running scheduled task: Update policy statuses');
            const updatedCount = await Policy.updateAllStatuses();
            console.log(`Updated ${updatedCount} policies to expired status`);
        } catch (error) {
            console.error('Error in scheduled policy update task:', error);
        }
    });
    
    console.log('Scheduled tasks initialized');
};

module.exports = { initScheduledTasks }; 