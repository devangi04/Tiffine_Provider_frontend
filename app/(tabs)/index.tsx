// // app/index.tsx
// import { useEffect } from 'react';
// import { Redirect } from 'expo-router';
// import { useSelector } from 'react-redux';
// import { RootState } from '../store';
// import { View, ActivityIndicator } from 'react-native';

// export default function Index() {
//   const hasCompletedWelcome = useSelector((state: RootState) => state.app.hasCompletedWelcome);
//   const isAuthenticated = useSelector((state: RootState) => state.provider.token !== null);

//   // This component will quickly redirect based on state
  
//   // If authenticated, go to dashboard
//   if (isAuthenticated) {
//     return <Redirect href="/dashboard" />;
//   }
  
//   // If state is still loading
//   if (hasCompletedWelcome === undefined) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
//         <ActivityIndicator size="large" color="#15803d" />
//       </View>
//     );
//   }

//   // Decision logic:
//   // - If welcome completed → login
//   // - If welcome NOT completed → welcome
//   return hasCompletedWelcome ? <Redirect href="/login" /> : <Redirect href="/welcome" />;
// }