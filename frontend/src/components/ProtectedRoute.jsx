
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';


const ProtectedRoute = ({ allowedRole }) => {
    const { isAuthenticated, user } = useAuth();


    if (!isAuthenticated) {

        return <Navigate to="/login" replace />;
    }


    if (user.role !== allowedRole) {


        return <Navigate to="/" replace />;
    }



    return <Outlet />;
};

export default ProtectedRoute;