import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/db/index";
import Dashboard from "@/components/Dashboard";

const page = async () => {
  // Get the current user from the session
  const { getUser } = getKindeServerSession();
  // Get the user details from the session
  const user = await getUser();

  // If user is logged in, but does not exist in the database, redirect to the auth-callback page
  // This happens when the user just registers and logs in for the first time
  if (!user || !user.id) {
    // Redirect to the auth-callback page with a query parameter to later redirect to the dashboard
    // from there
    console.log("User not logged in, redirecting to auth-callback page");
    return redirect("/auth-callback?origin=dashboard");
  }

  // If user is logged in and exists in the database, render the dashboard page
  const userDB = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!userDB) {
    console.log(
      "User not found in the database, redirecting to auth-callback page"
    );
    return redirect("/auth-callback?origin=dashboard");
  }

  return <Dashboard />;
};

export default page;
