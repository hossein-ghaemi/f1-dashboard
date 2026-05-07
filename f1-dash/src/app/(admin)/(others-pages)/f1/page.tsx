"use client"
import {useState, useEffect} from "react";
import SessionList from "@/components/f1/SessionList";
import LapInfo from "@/components/f1/LapsInfo";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";

export default function Page() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedSession, setSelectedSession] = useState(null);

    useEffect(() => {
        document.title = `Sessions (${year}) | F1 Dashboard`;
    }, [year]);
    return (
        <div>
            <PageBreadcrumb pageTitle={`Sessions (${year})`}/>
            <LapInfo sessionKey={selectedSession}/>
            <SessionList year={year} onSelect={setSelectedSession}/>

        </div>
    );
}