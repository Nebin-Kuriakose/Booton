import { supabase } from './supabaseClient';

/**
 * Completely removes a coach from the system
 * This function deletes:
 * - All messages involving the coach
 * - All coach-student relationships
 * - All progress tracking records
 * - All ratings
 * - The user record (which cascades to delete auth record)
 * 
 * @param {string} coachId - The ID of the coach to remove
 * @returns {Object} - Success or error result
 */
export const completelyRemoveCoach = async (coachId) => {
    try {
        // 1. Delete all messages where coach is sender or receiver
        const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .or(`sender_id.eq.${coachId},receiver_id.eq.${coachId}`);

        if (messagesError) throw new Error(`Failed to delete messages: ${messagesError.message}`);

        // 2. Delete all coach-student relationships
        const { error: coachStudentsError } = await supabase
            .from('coach_students')
            .delete()
            .eq('coach_id', coachId);

        if (coachStudentsError) throw new Error(`Failed to delete coach-student records: ${coachStudentsError.message}`);

        // 3. Delete all progress tracking records
        const { error: progressError } = await supabase
            .from('progress_tracking')
            .delete()
            .eq('coach_id', coachId);

        if (progressError) throw new Error(`Failed to delete progress records: ${progressError.message}`);

        // 4. Delete all ratings
        const { error: ratingsError } = await supabase
            .from('ratings')
            .delete()
            .eq('coach_id', coachId);

        if (ratingsError) throw new Error(`Failed to delete ratings: ${ratingsError.message}`);

        // 5. Finally delete the user record (which will cascade delete any remaining references)
        const { error: userError } = await supabase
            .from('users')
            .delete()
            .eq('id', coachId);

        if (userError) throw new Error(`Failed to delete user: ${userError.message}`);

        return { success: true, message: 'Coach completely removed from the system' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};
