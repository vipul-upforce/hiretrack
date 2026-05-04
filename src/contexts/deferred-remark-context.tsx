import React, { createContext, useState, useContext, useMemo, useCallback } from "react";

const DeferredRemarkContext = createContext<{
    remark: string;
    setRemark: (v: string) => void;
    isSubRemarkPrivate: boolean;
    setIsSubRemarkPrivate: (v: boolean) => void;
    remarkRating: number | null;
    setRemarkRating: (v: number | null) => void;
    clearDeferredRemark: () => void;
} | null>(null);

export function useDeferredRemark() {
    const ctx = useContext(DeferredRemarkContext);
    if (!ctx) throw new Error("useDeferredRemark must be used within DeferredRemarkProvider");
    return ctx;
}

export function DeferredRemarkProvider({ children }: { children: React.ReactNode }) {
    const [remark, setRemark] = useState("");
    const [isSubRemarkPrivate, setIsSubRemarkPrivate] = useState(true);
    const [remarkRating, setRemarkRating] = useState<number | null>(null);
    const clearDeferredRemark = useCallback(() => {
        setRemark("");
        setIsSubRemarkPrivate(true);
        setRemarkRating(null);
    }, []);
    const value = useMemo(
        () => ({
            remark,
            setRemark,
            isSubRemarkPrivate,
            setIsSubRemarkPrivate,
            remarkRating,
            setRemarkRating,
            clearDeferredRemark,
        }),
        [remark, isSubRemarkPrivate, remarkRating, clearDeferredRemark],
    );
    return (
        <DeferredRemarkContext.Provider value={value}>
            {children}
        </DeferredRemarkContext.Provider>
    );
}