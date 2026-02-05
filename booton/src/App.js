import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import RoleSelectScreen from './screens/RoleSelectScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import StudentAuthScreen from './screens/StudentAuthScreen';
import CoachAuthScreen from './screens/CoachAuthScreen';
import AdminHomeScreen from './screens/AdminHomeScreen';
import CoachHomeScreen from './screens/CoachHomeScreen';
import StudentHomeScreen from './screens/StudentHomeScreen';
import AdminStudentsScreen from './screens/AdminStudentsScreen';
import AdminCoachesScreen from './screens/AdminCoachesScreen';
import ApplicationsScreen from './screens/ApplicationsScreen';
import ChatScreen from './screens/ChatScreen';
import CoachStudentsScreen from './screens/CoachStudentsScreen';
import CoachDashboardScreen from './screens/CoachDashboardScreen';
import CoachProgressScreen from './screens/CoachProgressScreen';
import StudentDashboardScreen from './screens/StudentDashboardScreen';
import CoachProfileScreen from './screens/CoachProfileScreen';
import StudentProgressScreen from './screens/StudentProgressScreen';
import RateCoachScreen from './screens/RateCoachScreen';
import ReviewsScreen from './screens/ReviewsScreen';
import StudentCoachesScreen from './screens/StudentCoachesScreen';
import AdminChatsScreen from './screens/AdminChatsScreen';
import CoachEditProfileScreen from './screens/CoachEditProfileScreen';
import AdminValidationScreen from './screens/AdminValidationScreen';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator
                    screenOptions={{ headerShown: false }}
                    initialRouteName="RoleSelect"
                >
                    <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
                    <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
                    <Stack.Screen name="StudentAuth" component={StudentAuthScreen} />
                    <Stack.Screen name="CoachAuth" component={CoachAuthScreen} />
                    <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
                    <Stack.Screen name="CoachHome" component={CoachHomeScreen} />
                    <Stack.Screen name="StudentHome" component={StudentHomeScreen} />
                    <Stack.Screen name="AdminStudents" component={AdminStudentsScreen} />
                    <Stack.Screen name="AdminCoaches" component={AdminCoachesScreen} />
                    <Stack.Screen name="Applications" component={ApplicationsScreen} />
                    <Stack.Screen name="Chat" component={ChatScreen} />
                    <Stack.Screen name="CoachStudents" component={CoachStudentsScreen} />
                    <Stack.Screen name="CoachDashboard" component={CoachDashboardScreen} />
                    <Stack.Screen name="CoachProgress" component={CoachProgressScreen} />
                    <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
                    <Stack.Screen name="CoachProfile" component={CoachProfileScreen} />
                    <Stack.Screen name="StudentProgress" component={StudentProgressScreen} />
                    <Stack.Screen name="RateCoach" component={RateCoachScreen} />
                    <Stack.Screen name="Reviews" component={ReviewsScreen} />
                    <Stack.Screen name="StudentCoaches" component={StudentCoachesScreen} />
                    <Stack.Screen name="AdminChats" component={AdminChatsScreen} />
                    <Stack.Screen name="CoachEditProfile" component={CoachEditProfileScreen} />
                    <Stack.Screen name="AdminValidation" component={AdminValidationScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}
