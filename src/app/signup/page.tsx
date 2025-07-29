"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field } from "formik";
import { FormikErrors, FormikTouched, FieldProps } from "formik";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Sparkles } from "lucide-react";
import { cx } from "@/lib/cx";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { useCandidateSignupMutation } from "@/lib/features/candidate/candidateApi";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ReCAPTCHA from "react-google-recaptcha";
import Link from "next/link";
import Image from "next/image";
import { SignupSchema } from "./signupSchema";
import { TermsAndConditionsDialog } from "./TermsAndConditionsDialog";
import { Suspense } from "react";
import "./recaptcha-theme.css";

// Animated Grid Pattern Component (reused from login)
interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: any;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: AnimatedGridPatternProps) {
  const id = React.useId();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState(() => generateSquares(numSquares));

  function getPos() {
    return [
      Math.floor((Math.random() * dimensions.width) / width),
      Math.floor((Math.random() * dimensions.height) / height),
    ];
  }

  function generateSquares(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }));
  }

  const updateSquarePosition = (id: number) => {
    setSquares((currentSquares) =>
      currentSquares.map((sq) =>
        sq.id === id
          ? {
              ...sq,
              pos: getPos(),
            }
          : sq
      )
    );
  };

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares));
    }
  }, [dimensions, numSquares]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [containerRef]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [x, y], id }, index) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.1,
              repeatType: "reverse",
            }}
            onAnimationComplete={() => updateSquarePosition(id)}
            key={`${x}-${y}-${index}`}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}

// Flickering Grid Component (reused from login)
interface FlickeringGridProps {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
}

const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(0, 0, 0)",
  width,
  height,
  className,
  maxOpacity = 0.3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const memoizedColor = React.useMemo(() => {
    const toRGBA = (color: string) => {
      if (typeof window === "undefined") {
        return `rgba(0, 0, 0,`;
      }
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "rgba(255, 0, 0,";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
      return `rgba(${r}, ${g}, ${b},`;
    };
    return toRGBA(color);
  }, [color]);

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const cols = Math.floor(width / (squareSize + gridGap));
      const rows = Math.floor(height / (squareSize + gridGap));

      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }

      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity]
  );

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity]
  );

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number
    ) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const opacity = squares[i * rows + j];
          ctx.fillStyle = `${memoizedColor}${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * dpr,
            j * (squareSize + gridGap) * dpr,
            squareSize * dpr,
            squareSize * dpr
          );
        }
      }
    },
    [memoizedColor, squareSize, gridGap]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let gridParams: ReturnType<typeof setupCanvas>;

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
    };

    updateCanvasSize();

    let lastTime = 0;
    const animate = (time: number) => {
      if (!isInView) return;

      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      updateSquares(gridParams.squares, deltaTime);
      drawGrid(
        ctx,
        canvas.width,
        canvas.height,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr
      );
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    intersectionObserver.observe(canvas);

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      />
    </div>
  );
};

// Signup form interface
interface SignupFormValues {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  organizationInfo?: { name: string };
  termsAccepted?: boolean;
}

// Create a separate client component for the form
const SignupForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [signup, { isLoading }] = useCandidateSignupMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [orgName, setOrgName] = useState<string | undefined>();
  const [captcha, setCaptcha] = useState<string | undefined>();
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [setFieldValueFn, setSetFieldValueFn] = useState<
    ((field: string, value: any) => void) | null
  >(null);

  // Portal state
  const [portalLogo, setPortalLogo] = useState<string | null>(null);
  const [portalLogoDark, setPortalLogoDark] = useState<string | null>(null);
  const [portalFavicon, setPortalFavicon] = useState<string | null>(null);
  const [portalName, setPortalName] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState<string>("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState<string>("#8b5cf6");
  const [isLoadingPortal, setIsLoadingPortal] = useState<boolean>(true);
  const [portalError, setPortalError] = useState<boolean>(false);

  const initialValues: SignupFormValues = {
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
    termsAccepted: false,
  };

  // Extract orgName from query string
  useEffect(() => {
    if (typeof window !== "undefined") {
      const orgNameFromQuery = searchParams?.get("o");
      if (orgNameFromQuery) {
        setOrgName(decodeURIComponent(orgNameFromQuery));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    async function checkAllowance() {
      const data = await fetch("/api/organization");
      if (!data.ok) {
        const allowance = await data.json();
        if (!allowance.allow) {
          router.push("/signup");
        }
      }
    }
    checkAllowance();
  }, [router]);

  // Set initial loading title
  useEffect(() => {
    document.title = "Loading...";
  }, []);

  // Fetch portal settings for logo and name
  useEffect(() => {
    async function fetchPortalSettings() {
      setIsLoadingPortal(true);
      setPortalError(false);

      try {
        const response = await fetch("/api/settings/portal");
        if (response.ok) {
          const data = await response.json();

          // Update portal settings if data exists
          if (data.portalLogo?.url) {
            setPortalLogo(data.portalLogo.url);
          }
          if (data.portalLogoDark?.url) {
            setPortalLogoDark(data.portalLogoDark.url);
          }
          if (data.portalFavicon?.url) {
            setPortalFavicon(data.portalFavicon.url);
            // Set favicon
            const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (favicon) {
              favicon.href = data.portalFavicon.url;
            } else {
              const newFavicon = document.createElement("link");
              newFavicon.rel = "icon";
              newFavicon.href = data.portalFavicon.url;
              document.head.appendChild(newFavicon);
            }
          }
          if (data.primaryColor) {
            setPrimaryColor(data.primaryColor);
          }
          if (data.secondaryColor) {
            setSecondaryColor(data.secondaryColor);
          }
          if (data.portalName) {
            setPortalName(data.portalName);
            document.title = `Sign Up - ${data.portalName}`;
          } else {
            // Use default title if no portal name
            document.title = "Sign Up - HireTrack";
          }
        } else {
          // API call failed
          setPortalError(true);
          document.title = "Sign Up - HireTrack";
        }
      } catch (error) {
        console.error("Failed to fetch portal settings:", error);
        setPortalError(true);
        document.title = "Sign Up - HireTrack";
      } finally {
        setIsLoadingPortal(false);
      }
    }
    fetchPortalSettings();
  }, []);

  // Get default logo based on theme
  const getDefaultLogo = () => {
    return theme === "dark" ? "/logo_dark.png" : "/logo.png";
  };

  // Get logo URL with fallback
  const getLogoUrl = () => {
    // Only use default logo if portal fetch failed or no custom logo
    if (portalError || (!isLoadingPortal && !portalLogo && !portalLogoDark)) {
      return getDefaultLogo();
    }
    
    // Use appropriate logo based on theme
    if (theme === "dark" && portalLogoDark) {
      return portalLogoDark;
    } else if (portalLogo) {
      return portalLogo;
    }
    
    return "";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleSubmit = async (
    values: SignupFormValues,
    { setStatus }: { setStatus: (message: string) => void }
  ) => {
    try {
      const signupData = {
        ...values,
        email: values.email.toLowerCase().trim(),
        name: values.name.trim(),
        ...(orgName && { orgName: orgName }),
      };
      const response = await signup(signupData).unwrap();

      if (response.user) {
        toast({
          title: "Success",
          description: "Account created successfully",
          variant: "default",
        });
        router.push("/auth/login");
      } else {
        throw new Error("No user data received");
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to create account";
      if (error && typeof error === "object" && "data" in error) {
        errorMessage =
          (error.data as { error: string }).error ||
          "Failed to parse user data from cookie";
      }
      setStatus(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Apply portal colors to CSS custom properties
  useEffect(() => {
    if (!portalError && !isLoadingPortal) {
      document.documentElement.style.setProperty('--portal-primary', primaryColor);
      document.documentElement.style.setProperty('--portal-secondary', secondaryColor);
    }
  }, [primaryColor, secondaryColor, portalError, isLoadingPortal]);

  // Show loading indicator while fetching portal settings
  if (isLoadingPortal) {
    return (
      <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-4">
        {/* Animated Background for loading state */}
        <div className="absolute inset-0">
          <AnimatedGridPattern
            numSquares={30}
            maxOpacity={0.05}
            duration={3}
            repeatDelay={1}
            className={cx(
              "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
              "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
            )}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 animate-pulse" />
            <div className="absolute inset-2">
              <div className="w-full h-full rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground animate-pulse">
              Please wait...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-4">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <AnimatedGridPattern
            numSquares={30}
            maxOpacity={0.1}
            duration={3}
            repeatDelay={1}
            className={cx(
              "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
              "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
            )}
          />
          <FlickeringGrid
            className="absolute inset-0 size-full opacity-50"
            squareSize={4}
            gridGap={6}
            color={primaryColor}
            maxOpacity={0.3}
            flickerChance={0.1}
          />
        </div>

        {/* Gradient Orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000"
          style={{
            background: `linear-gradient(225deg, ${secondaryColor}15, ${primaryColor}15)`
          }}
        />

        {/* Theme Toggle in top right corner */}
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background/90"
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left space-y-6"
          >
            <div className="space-y-4">
              {/* Logo Section */}
              <div className="flex justify-center lg:justify-start mb-4">
                <div className="relative w-72 h-36">
                  <Image
                    src={getLogoUrl()}
                    alt={portalName || (portalError ? "HireTrack" : "")}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Join Our
                <br />
                <span 
                  className="bg-clip-text text-transparent"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text'
                  }}
                >
                  Talent Pool
                </span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-md mx-auto lg:mx-0">
                Create your profile to apply to all future job openings and 
                track your application status in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              {["Fast Apply", "Profile Matching", "Career Growth"].map(
                (feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-2 px-3 py-1 bg-background/50 backdrop-blur-sm rounded-full border border-border/50"
                  >
                    <Sparkles 
                      className="w-4 h-4"
                      style={{ color: primaryColor }}
                    />
                    <span className="text-sm">{feature}</span>
                  </motion.div>
                )
              )}
            </div>
          </motion.div>

          {/* Right Side - Signup Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {/* Hover Effect */}
            {isHovering && (
              <motion.div
                className="absolute pointer-events-none w-96 h-96 rounded-full blur-3xl"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20, ${primaryColor}15)`,
                  transform: `translate(${mousePosition.x - 192}px, ${mousePosition.y - 192}px)`,
                }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
              />
            )}

            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Create Account</h2>
                {orgName && (
                  <div className="mt-2">
                    <span
                      className="text-lg font-medium"
                      style={{ 
                        color: primaryColor,
                        animation: orgName
                          ? "fadeInOrg 0.9s ease-in-out forwards"
                          : "none",
                      }}
                    >
                      {orgName}
                    </span>
                  </div>
                )}
              </div>

              <Formik
                initialValues={initialValues}
                validationSchema={SignupSchema}
                onSubmit={handleSubmit}
              >
                {({
                  errors,
                  touched,
                  isSubmitting,
                  values,
                  setFieldValue,
                }: {
                  errors: FormikErrors<SignupFormValues>;
                  touched: FormikTouched<SignupFormValues>;
                  isSubmitting: boolean;
                  values: SignupFormValues;
                  setFieldValue: (field: string, value: any) => void;
                }) => {
                  useEffect(() => {
                    setSetFieldValueFn(() => setFieldValue);
                  }, [setFieldValue]);

                  return (
                    <Form className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Field name="name">
                            {({ field }: FieldProps) => (
                              <input
                                {...field}
                                type="text"
                                placeholder="Enter your full name"
                                disabled={isLoading || isSubmitting}
                                className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-current transition-all"
                                style={{
                                  '--tw-ring-color': `${primaryColor}50`,
                                  '--tw-border-opacity': '1'
                                } as React.CSSProperties}
                                onFocus={(e) => e.target.style.borderColor = primaryColor}
                                onBlur={(e) => e.target.style.borderColor = ''}
                              />
                            )}
                          </Field>
                          {errors.name && touched.name && (
                            <div className="text-sm text-red-500 mt-1">
                              {errors.name}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Field name="email">
                            {({ field }: FieldProps) => (
                              <input
                                {...field}
                                type="email"
                                placeholder="Enter your email"
                                disabled={isLoading || isSubmitting}
                                className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-current transition-all"
                                style={{
                                  '--tw-ring-color': `${primaryColor}50`,
                                  '--tw-border-opacity': '1'
                                } as React.CSSProperties}
                                onFocus={(e) => e.target.style.borderColor = primaryColor}
                                onBlur={(e) => e.target.style.borderColor = ''}
                              />
                            )}
                          </Field>
                          {errors.email && touched.email && (
                            <div className="text-sm text-red-500 mt-1">
                              {errors.email}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Field name="password">
                            {({ field }: FieldProps) => (
                              <input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                disabled={isLoading || isSubmitting}
                                className="w-full pl-10 pr-12 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-current transition-all"
                                style={{
                                  '--tw-ring-color': `${primaryColor}50`,
                                  '--tw-border-opacity': '1'
                                } as React.CSSProperties}
                                onFocus={(e) => e.target.style.borderColor = primaryColor}
                                onBlur={(e) => e.target.style.borderColor = ''}
                              />
                            )}
                          </Field>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                          {errors.password && touched.password && (
                            <div className="text-sm text-red-500 mt-1">
                              {errors.password}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Field name="confirmPassword">
                            {({ field }: FieldProps) => (
                              <input
                                {...field}
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                disabled={isLoading || isSubmitting}
                                className="w-full pl-10 pr-12 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-current transition-all"
                                style={{
                                  '--tw-ring-color': `${primaryColor}50`,
                                  '--tw-border-opacity': '1'
                                } as React.CSSProperties}
                                onFocus={(e) => e.target.style.borderColor = primaryColor}
                                onBlur={(e) => e.target.style.borderColor = ''}
                              />
                            )}
                          </Field>
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                          {errors.confirmPassword && touched.confirmPassword && (
                            <div className="text-sm text-red-500 mt-1">
                              {errors.confirmPassword}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Custom styled reCAPTCHA */}
                      <div className="flex justify-center">
                        <div className="recaptcha-container">
                          <ReCAPTCHA
                            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                            onChange={(token) => {
                              if (token) setCaptcha(token);
                            }}
                            theme={theme as "light" | "dark"}
                          />
                        </div>
                      </div>

                      <Field name="termsAccepted">
                        {({ field, form }: FieldProps) => (
                          <div className="space-y-1">
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                id="termsAccepted"
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  setShowTermsDialog(true);
                                  form.setFieldValue("termsAccepted", false);
                                }}
                              />
                              <label htmlFor="termsAccepted" className="text-sm">
                                I agree to the{" "}
                                <button
                                  type="button"
                                  className="underline"
                                  style={{ color: primaryColor }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setShowTermsDialog(true);
                                    form.setFieldValue("termsAccepted", false);
                                  }}
                                >
                                  Terms
                                </button>{" "}
                                and{" "}
                                <button
                                  type="button"
                                  className="underline"
                                  style={{ color: primaryColor }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setShowTermsDialog(true);
                                    form.setFieldValue("termsAccepted", false);
                                  }}
                                >
                                  Privacy Policy
                                </button>
                              </label>
                            </div>
                            {errors.termsAccepted && touched.termsAccepted && (
                              <div className="text-sm text-red-500">
                                {errors.termsAccepted}
                              </div>
                            )}
                          </div>
                        )}
                      </Field>

                      <motion.button
                        type="submit"
                        disabled={
                          isLoading ||
                          !captcha ||
                          isSubmitting ||
                          !values?.termsAccepted
                        }
                        className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 relative overflow-hidden group"
                        style={{
                          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        {isLoading || isSubmitting ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating Account...
                          </div>
                        ) : (
                          "Sign Up"
                        )}
                      </motion.button>

                      <div className="text-center pt-4">
                        <span className="text-muted-foreground">Already have an account? </span>
                        <Link
                          href="/auth/login"
                          className="font-medium hover:underline"
                          style={{ color: primaryColor }}
                        >
                          Sign in here
                        </Link>
                      </div>
                    </Form>
                  );
                }}
              </Formik>
            </div>
          </motion.div>
        </div>
      </div>

      <TermsAndConditionsDialog
        open={showTermsDialog}
        onOpenChange={setShowTermsDialog}
        onAccept={(accepted: boolean) => {
          setFieldValueFn?.("termsAccepted", accepted);
          setShowTermsDialog(false);
        }}
      />
    </>
  );
};

// Main page component
export default function Signup() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary animate-spin rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}