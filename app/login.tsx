// app/login.jsx
import AuthScreen from './auth';
import { StatusBar } from 'react-native';

export default function Login() {
  
  return (
    <>
   <StatusBar barStyle="dark-content" backgroundColor="#c93434ff" />
  <AuthScreen />
  </>
 );
}