
import { createContext, useEffect, useState } from 'react';
import { InvoiceList } from '../../types/apps/invoice';
import React from "react";
import useSWR from 'swr';




interface InvoiceContextType {
    invoices: InvoiceList[];
    loading: boolean;
    error: Error | null;
    deleteEmail: () => {},
    addInvoice: (newInvoice: InvoiceList) => void;
    updateInvoice: (updatedInvoice: InvoiceList) => void;
}

export const InvoiceContext = createContext<InvoiceContextType | any>(undefined);

export const InvoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [invoices, setInvoices] = useState<InvoiceList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // const { data: invoiceData, isLoading: isInvoiceLoading, error: invoiceError, mutate } = {data: null,  isLoading: null, error: null, mutate: null };

    // useEffect(() => {
    //     if (invoiceData) {
    //         setInvoices(invoiceData.data);
    //         setLoading(isInvoiceLoading);
    //     } else if (invoiceError) {
    //         setLoading(isInvoiceLoading);
    //         setError(invoiceError);
    //     } else {
    //         setLoading(isInvoiceLoading)
    //     }
    // }, [invoiceData, invoiceError, isInvoiceLoading]);

    // // Function to delete an invoice
    // const deleteInvoice = async (invoiceId: number) => {
    //     try {
    //         await mutate(deleteFetcher('/api/data/invoicedata/deleteinvoice', { invoiceId }));
    //     } catch (error) {
    //         console.error('Error deleting invoice:', error);
    //     }
    // };

    // const addInvoice = async (newInvoice: InvoiceList) => {
    //     try {
    //         await mutate(postFetcher('/api/data/invoicedata/addinvoice', newInvoice));
    //     } catch (error) {
    //         console.error('Error adding invoice:', error);
    //     }
    // };

    // //  Function to update an invoice
    // const updateInvoice = async (updatedInvoice: InvoiceList) => {
    //     try {
    //         await mutate(putFetcher('/api/data/invoicedata/updateinvoice', updatedInvoice))
    //     } catch (error) {
    //         console.error('Error updating invoice:', error);
    //     }
    // };

    return (
        <InvoiceContext.Provider value={{ invoices, loading, error }}>
            {children}
        </InvoiceContext.Provider>
    );
};