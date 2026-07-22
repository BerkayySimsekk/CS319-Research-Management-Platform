
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';



export const API_BASE_URL = 'http://localhost:8080';
export const api = axios.create({
    baseURL: API_BASE_URL
});


api.interceptors.request.use(
    (config) => {

        const token = localStorage.getItem('accessToken');
        if (token) {

            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {

        return Promise.reject(error);
    }
);



const AuthContext = createContext();


export const useAuth = () => {
    return useContext(AuthContext);
};


export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const userData = localStorage.getItem('user');

        if (token && userData) {

            setUser(JSON.parse(userData));
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);


    const login = (authData) => {



        localStorage.setItem('accessToken', authData.accessToken);


        const userData = {
            id: authData.id,
            name: authData.name,
            email: authData.email,
            role: authData.role
        };
        localStorage.setItem('user', JSON.stringify(userData));


        setUser(userData);
        setIsAuthenticated(true);
    };


    const logout = () => {

        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');


        setUser(null);
        setIsAuthenticated(false);
    };


    const updateUser = (updatedUserData) => {
        const newUserData = { ...user, ...updatedUserData };
        localStorage.setItem('user', JSON.stringify(newUserData));
        setUser(newUserData);
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        updateUser
    };



    if (loading) {
        return <div>Uygulama Yükleniyor...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
