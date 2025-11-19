"use client";
import React from 'react';
import ClientForm from '@/components/clients/ClientForm';

const RootClientCreatePage: React.FC = () => {
  return <ClientForm mode="create" onSuccess={(data:any)=> {
    const pc = data?.public_code || data?.data?.settings?.enterprise?.meta?.public_code;
    const cc = data?.client_code || data?.data?.settings?.enterprise?.client_code;
    console.log('Created client codes:', { client_code: cc, public_code: pc });
    alert(`Client created. Code: ${cc || 'N/A'} Public: ${pc || 'N/A'}`);
  }} />;
};

export default RootClientCreatePage;
