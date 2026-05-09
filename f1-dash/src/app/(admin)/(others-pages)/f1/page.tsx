"use client"
import {BrowserRouter, Routes, Route} from "react-router-dom";
import SessionList from "@/components/f1/SessionList";
import SessionPage from "./sessionDetails/page";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/f1" element={<SessionList year={2026}/>}/>
                <Route path="/sessionDetails/:year/:round/:session"
                       element={<SessionPage/>}/>
            </Routes>
        </BrowserRouter>
    );
}