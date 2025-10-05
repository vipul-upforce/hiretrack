"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Building2, Sparkles } from "lucide-react";
import { cx } from "@/lib/cx";
import { useRouter } from "next/navigation";
import { useHandleLoginSubmit } from "@/app/auth/hooks/useLoginSubmit";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Image from "next/image";
import Cookies from "js-cookie";
import { OneOfMulOrganization } from "@/components/auth/OrganizationDialog";
import ForgotPasswordDialog from "@/components/auth/ForgotPasswordDialog";
import OrganizationDialog from "@/components/auth/OrganizationDialog";
import { LoginFormValues } from "@/types/login";
import ReCAPTCHA from "react-google-recaptcha";
import "./recaptcha-theme.css";
import { useSelector } from "react-redux";
import { useGetCaptchaConfigsQuery } from "@/lib/features/settings/settingsApi";
import { getDecodedCaptcha } from "@/hooks/useSSE";
import packageJson from "@/../package.json";

// Animated Grid Pattern Component
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

// Flickering Grid Component
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

// Main Login Form Content Component
interface LoginFormContentProps {
  showCompanyField?: boolean;
}

export default function LoginFormContent({
  showCompanyField = false,
}: LoginFormContentProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    companyName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [organizations, setOrganizations] = useState<OneOfMulOrganization[]>(
    []
  );
  const { user } = useSelector((state: any) => state.auth || {});
  const [loginFormValues, setLoginFormValues] = useState<LoginFormValues>();
  const [selectedOrg, setSelectedOrg] = useState<string>();
  const [isMultiple, setIsMultiple] = useState<boolean>(false);
  const [portalLogo, setPortalLogo] = useState<string | null>(null);
  const [portalLogoDark, setPortalLogoDark] = useState<string | null>(null);
  const [portalFavicon, setPortalFavicon] = useState<string | null>(null);
  const [portalName, setPortalName] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState<string>("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState<string>("#8b5cf6");
  // const [captcha, setCaptcha] = useState<string>();
  const [captcha, setCaptcha] = useState<string | null>(null); // Allow null for no CAPTCHA
  const [isLoadingPortal, setIsLoadingPortal] = useState<boolean>(true);
  const [portalError, setPortalError] = useState<boolean>(false);
  const [decryptedSiteKey, setDecryptedSiteKey] = useState<string | null>(null);

  // useHandleLoginSubmit, which uses useSearchParams, is now called within this client component
  const { handleSubmit, isLoading } = useHandleLoginSubmit({
    selectedOrg,
    isMultiple,
    setOrganizations,
    setOrganizationDialogOpen,
    setLoginFormValues,
  });
  // Fetch CAPTCHA configuration
  const {
    data: captchaConfig,
    isLoading: isCaptchaLoading,
    error: captchaError,
  } = useGetCaptchaConfigsQuery(undefined);
  useEffect(() => {
    // debugger;
    if (user && user.id && user.role) {
      router.push("/dashboard");
    }
  }, [user]);
  // console.log(data, "data og captcha ");
  // console.log(captchaConfig, "config captcha");

  // Decrypt siteKey when captchaConfig is available
  useEffect(() => {
    const decryptSiteKey = async () => {
      if (captchaConfig?.captcha?.siteKey) {
        const decrypted = await getDecodedCaptcha(
          captchaConfig.captcha.siteKey
        );
        if (decrypted) {
          setDecryptedSiteKey(decrypted);
        }
      }
    };
    decryptSiteKey();
  }, [captchaConfig]);

  useEffect(() => {
    async function checkAllowance() {
      const data = await fetch("/api/orgs");
      if (data.ok) {
        const response = await data.json();
        // If there are multiple portals, allow selection
        if (response.portals && response.portals.length > 1) {
          setIsMultiple(true);
        }
      }
    }
    checkAllowance();
  }, []);

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
            const favicon = document.querySelector(
              "link[rel*='icon']"
            ) as HTMLLinkElement;
            // debugger;
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
            document.title = data.portalName;
          } else {
            // Use default title if no portal name
            document.title = "HireTrack";
          }
        } else {
          // API call failed
          setPortalError(true);
          document.title = "HireTrack";
        }
      } catch (error) {
        console.error("Failed to fetch portal settings:", error);
        setPortalError(true);
        document.title = "HireTrack";
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(
      {
        email: formData.email,
        password: formData.password,
      },
      { setStatus: () => {} }
    );
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Apply portal colors to CSS custom properties
  useEffect(() => {
    if (!portalError && !isLoadingPortal) {
      document.documentElement.style.setProperty(
        "--portal-primary",
        primaryColor
      );
      document.documentElement.style.setProperty(
        "--portal-secondary",
        secondaryColor
      );
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
            {/* <p className="text-lg font-medium text-foreground">Loading Portal Settings</p> */}
            <p className="text-sm text-muted-foreground animate-pulse">
              Please wait...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const appVersion = packageJson.version;

  return (
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
          background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`,
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000"
        style={{
          background: `linear-gradient(225deg, ${secondaryColor}15, ${primaryColor}15)`,
        }}
      />

      {/* Theme Toggle in top right corner */}
      <div
        className="absolute top-4 right-4"
        style={{
          zIndex: 999,
        }}
      >
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
              Smart Hiring
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }}
              >
                Made Simple
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md mx-auto lg:mx-0">
              Revolutionize your recruitment process with AI-powered candidate
              matching and intelligent screening.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            {["AI Matching", "Smart Screening", "Analytics"].map(
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

        {/* Right Side - Login Form */}
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
              <h2 className="text-2xl font-bold mb-2">Welcome </h2>

              {selectedOrg && (
                <div className="mt-2">
                  <span
                    className="text-lg font-medium cursor-pointer"
                    style={{
                      color: primaryColor,
                      animation: selectedOrg
                        ? "fadeInOrg 0.9s ease-in-out forwards"
                        : "none",
                    }}
                    onClick={() => {
                      setSelectedOrg("");
                      setOrganizationDialogOpen(true);
                    }}
                  >
                    {
                      organizations.find((org) => org.orgId === selectedOrg)
                        ?.name
                    }
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              {showCompanyField && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) =>
                        handleInputChange("companyName", e.target.value)
                      }
                      className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-current transition-all"
                      style={
                        {
                          "--tw-ring-color": `${primaryColor}50`,
                          "--tw-border-opacity": "1",
                        } as React.CSSProperties
                      }
                      onFocus={(e) =>
                        (e.target.style.borderColor = primaryColor)
                      }
                      onBlur={(e) => (e.target.style.borderColor = "")}
                      placeholder="Enter your company name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-current transition-all"
                    style={
                      {
                        "--tw-ring-color": `${primaryColor}50`,
                        "--tw-border-opacity": "1",
                      } as React.CSSProperties
                    }
                    onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                    onBlur={(e) => (e.target.style.borderColor = "")}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="w-full pl-10 pr-12 py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:border-current transition-all"
                    style={
                      {
                        "--tw-ring-color": `${primaryColor}50`,
                        "--tw-border-opacity": "1",
                      } as React.CSSProperties
                    }
                    onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                    onBlur={(e) => (e.target.style.borderColor = "")}
                    placeholder="Enter your password"
                    required
                  />
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
                </div>
              </div>

              {/* Custom styled reCAPTCHA */}
              {/* <div className="flex justify-center">
                <div className="recaptcha-container">
                  <ReCAPTCHA
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                    onChange={(token) => {
                      if (token) setCaptcha(token);
                    }}
                    theme={theme as "light" | "dark"}
                  />
                </div>
              </div> */}

              {/* Conditionally render CAPTCHA if enabled and siteKey is available */}
              {captchaConfig?.captcha?.enableCaptcha && decryptedSiteKey && (
                <div className="flex justify-center">
                  <div className="recaptcha-container">
                    <ReCAPTCHA
                      sitekey={decryptedSiteKey}
                      onChange={(token) => setCaptcha(token)}
                      theme={theme as "light" | "dark"}
                    />
                  </div>
                </div>
              )}
              {/* Optional: Show error message if CAPTCHA config fails */}
              {/* {captchaError && (
                <div className="text-red-500 text-sm text-center">
                  Failed to load CAPTCHA configuration. Please try again later.
                </div>
              )} */}
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-sm text-muted-foreground">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-sm hover:underline"
                  style={{ color: primaryColor }}
                >
                  Forgot password?
                </button>
              </div>

              <motion.button
                type="submit"
                // disabled={isLoading || !captcha}
                disabled={
                  isLoading ||
                  (captchaConfig?.captcha?.enableCaptcha && !captcha)
                }
                className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 relative overflow-hidden group"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>

      <ForgotPasswordDialog
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />

      {loginFormValues && !selectedOrg && (
        <OrganizationDialog
          isOpen={organizationDialogOpen}
          onClose={() => setOrganizationDialogOpen(false)}
          data={{ ...loginFormValues, organizations }}
          setSelectedOrgId={(orgId: string) => setSelectedOrg(orgId)}
        />
      )}
      {/* App version in bottom right corner */}
      <div
        className="fixed bottom-2 right-4 text-xs text-gray-400 select-none pointer-events-none z-50"
        aria-label="App Version"
      >
        v{appVersion}
      </div>
    </div>
  );
}
