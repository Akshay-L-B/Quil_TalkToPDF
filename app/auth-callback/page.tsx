"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "../_trpc/client";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const Page = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const origin = searchParams.get("origin");

  // trpc.authCallback.useQuery(undefined, {
  //   // onSuccess: ({ success }) => {
  //   //   if (success) {
  //   //     router.push(origin ? `/${origin}` : "/dashboard");
  //   //     console.log("User is now authenticated and in the database");
  //   //   }
  //   // },

  //   // onError: (error: any) => {
  //   //   if (error?.data?.code === "UNAUTHORIZED") {
  //   //     router.push(`/sign-in`);
  //   //   }
  //   //   console.error(error);
  //   // },

  //   // retry on error until success for every 500ms
  //   retry: true,
  //   retryDelay: 500,
  // });

  const { data } = trpc.authCallback.useQuery();

  useEffect(() => {
    if (data && data.success) {
      router.push(origin ? `/${origin}` : "/dashboard");
      console.log("User is now authenticated and in the database");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // if user is not sync with the database
  return (
    <div className="w-full mt-24 flex justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-800" />
        <h3 className="font-semibold text-xl">Setting up your account...</h3>
        <p>You will be redirected automatically.</p>
      </div>
    </div>
  );
};

export default Page;
