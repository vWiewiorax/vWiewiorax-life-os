export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
