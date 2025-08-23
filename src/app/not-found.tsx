"use client";
import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
interface INoDataFound {
  name: string;
}
export const NoDataFound = (props: INoDataFound) => {
  const { name } = props;
  const router = useRouter();
  const handleClick = () => {
    const user = Cookies.get("user");
    if (user) {
      // debugger;
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  };
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="flex flex-col items-center justify-center p-6   rounded-md">
        <Image
          src="/notfound.jpg"
          alt="No data illustration"
          width={600}
          height={600}
        />
        <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
          No {name} Found
        </h2>
        <p className="mt-2 text-gray-600">
          We couldn&apos;t find any Page to display.
        </p>
        <Button className="mt-4" onClick={handleClick}>
          Go to Home
        </Button>
      </div>
    </div>
  );
};

export default NoDataFound;
