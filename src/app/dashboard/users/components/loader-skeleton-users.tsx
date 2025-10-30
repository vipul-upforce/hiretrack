import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LoaderSkeletonUsers = () => (
  <div className="w-[100%]">
    <div className="p-6 border-b  flex justify-between items-center">
      <Skeleton className="w-56 h-[16px] rounded-lg" />
      <Button disabled={true}>Create User</Button>
    </div>
    <Card className="m-6">
      <CardHeader className="flex flex-row items-center justify-between ">
        <CardTitle>Users</CardTitle>

      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7].map((title, i) => (
              <TableRow key={i}>
                <TableCell>
                  {" "}
                  <Skeleton className="w-[50%] h-5 rounded-lg" />
                </TableCell>
                <TableCell>
                  {" "}
                  <Skeleton className="w-[50%] h-5 rounded-lg" />
                </TableCell>
                <TableCell>
                  {" "}
                  <Skeleton className="w-[30%] h-5 rounded-lg" />
                </TableCell>
                <TableCell>
                  {" "}
                  <Skeleton className="w-[60%] h-5 rounded-lg" />
                </TableCell>
                <TableCell className="w-[200px]">
                  <Skeleton className="ml-2 w-5 h-5 inline-block rounded-full" />
                  <Skeleton className="ml-2 w-5 h-5 inline-block rounded-full" />
                  <Skeleton className="ml-2 w-5 h-5 inline-block rounded-full" />
                  <Skeleton className="ml-2 w-5 h-5 inline-block rounded-full" />

                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
);

export default LoaderSkeletonUsers;
