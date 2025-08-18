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
  <div className="w-[100%] py-6 px-6">
    <div className="pb-6">
      <Skeleton className="w-56 h-[16px] rounded-lg" />
    </div>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Users</CardTitle>
        <Button disabled={true}>Create User</Button>
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
                  <Skeleton className="w-full h-5 rounded-lg" />
                </TableCell>
                <TableCell>
                  {" "}
                  <Skeleton className="w-full h-5 rounded-lg" />
                </TableCell>
                <TableCell>
                  {" "}
                  <Skeleton className="w-full h-5 rounded-lg" />
                </TableCell>
                <TableCell>
                  {" "}
                  <Skeleton className="w-full h-5 rounded-lg" />
                </TableCell>
                <TableCell className="w-[100px]">
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
