import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Admin login (hardcoded check)
export const adminLogin = async (email, password) => {
    try {
        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { success: false, error: error.message };
        }

        // Add a small delay to ensure database is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if user is admin in users table
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, name, role, is_approved')
            .eq('id', data.user.id)
            .single();

        console.log('Admin login - User data query:', { userData, userError });

        if (userError) {
            console.error('Admin login - User query error:', userError);
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            return { success: false, error: 'Failed to verify admin status' };
        }

        if (userData?.role !== 'admin') {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            return { success: false, error: 'Not an admin account' };
        }

        if (userData?.is_approved !== true) {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            return { success: false, error: 'Admin account not approved' };
        }

        // Admin is approved - store user data
        await AsyncStorage.setItem('user', JSON.stringify({ ...data.user, ...userData }));

        return { success: true, user: { ...data.user, ...userData } };
    } catch (error) {
        console.error('Admin login error:', error);
        return { success: false, error: error.message };
    }
};

// Student signup
export const studentSignup = async (email, password, name) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, role: 'student' }
            }
        });

        if (error) return { success: false, error: error.message };

        // Insert into users table - students are auto-approved
        const { error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    id: data.user.id,
                    email,
                    name,
                    role: 'student',
                    is_approved: true
                }
            ]);

        if (insertError) return { success: false, error: insertError.message };

        // Check if email confirmation is required
        const needsConfirmation = !data.user.confirmed_at;

        return {
            success: true,
            user: data.user,
            message: needsConfirmation ? 'Account created! Please check your email to confirm.' : undefined
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Student login
export const studentLogin = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) return { success: false, error: error.message };

        // Add a small delay to ensure database is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify student role and check if blocked
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, name, role, is_blocked')
            .eq('id', data.user.id)
            .single();

        console.log('Student login - User data query:', { userData, userError });

        if (userError || userData?.role !== 'student') {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            return { success: false, error: 'Not a student account' };
        }

        // Check if student is blocked
        if (userData?.is_blocked === true) {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            return { success: false, error: 'Your account has been blocked. Please contact admin.' };
        }

        // Student account is valid - store user data
        await AsyncStorage.setItem('user', JSON.stringify({ ...data.user, ...userData }));

        return { success: true, user: { ...data.user, ...userData } };
    } catch (error) {
        console.error('Student login error:', error);
        return { success: false, error: error.message };
    }
};

// Coach signup
export const coachSignup = async (email, password, name, position, experience, paymentFee, achievements) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, role: 'coach' }
            }
        });

        if (error) return { success: false, error: error.message };

        // Insert into users table with approval status set to false
        const { error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    id: data.user.id,
                    email,
                    name,
                    role: 'coach',
                    position,
                    experience,
                    payment_fee: paymentFee,
                    achievements,
                    is_approved: false // Requires admin approval
                }
            ]);

        if (insertError) return { success: false, error: insertError.message };

        return { success: true, user: data.user, message: 'Application submitted! Wait for admin approval.' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Coach login
export const coachLogin = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) return { success: false, error: error.message };

        // Add a small delay to ensure database is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify coach role and check if approved
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, name, role, is_approved, profile_image, experience, position')
            .eq('id', data.user.id)
            .single();

        console.log('Coach login - User data query:', { userData, userError });

        if (userError) {
            console.error('Coach login - User query error:', userError);
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            return { success: false, error: 'Failed to fetch user data. Please try again.' };
        }

        if (!userData || userData?.role !== 'coach') {
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            return { success: false, error: 'Not a coach account' };
        }

        // Check if coach is approved - THIS IS THE KEY CHECK
        if (userData.is_approved !== true) {
            console.log('Coach login - Coach not approved:', userData.is_approved);
            await supabase.auth.signOut();
            await AsyncStorage.removeItem('user');
            return { success: false, error: 'Your application is pending admin approval.' };
        }

        // Coach is approved - store user data
        await AsyncStorage.setItem('user', JSON.stringify({ ...data.user, ...userData }));

        return { success: true, user: { ...data.user, ...userData } };
    } catch (error) {
        console.error('Coach login error:', error);
        return { success: false, error: error.message };
    }
};

// Logout
export const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
};
