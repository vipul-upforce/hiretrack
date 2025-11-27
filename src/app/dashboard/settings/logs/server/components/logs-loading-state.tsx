import DesktopSkeletonHistroyLogs from "./history-logs-desktop-skeleton";
import MobileSkeletonHistroyLogs from "./history-logs-mobile-skeleton";

export function LogsLoadingState() {
  return (
    <>
      <MobileSkeletonHistroyLogs />
      <DesktopSkeletonHistroyLogs />
    </>
  );
}
