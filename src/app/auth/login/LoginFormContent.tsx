'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Building2, Sparkles } from 'lucide-react';
import { cx } from '@/lib/cx';
import { useRouter } from 'next/navigation';
import { useHandleLoginSubmit } from '@/app/auth/hooks/useLoginSubmit';
import { useTheme } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Image from 'next/image';
import OrganizationDialog, {
  OneOfMulOrganization,
} from '@/components/auth/OrganizationDialog';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';
import { LoginFormValues } from '@/types/login';
import ReCAPTCHA from 'react-google-recaptcha';
import './recaptcha-theme.css';
import { useSelector } from 'react-redux';
import {
  useGetCaptchaConfigsQuery,
  useGetPortalConfigsQuery,
} from '@/lib/features/settings';
import { getDecodedCaptcha } from '@/hooks/useSSE';
import { useFetchOrgQuery } from '@/lib/features/org/orgApi';
import LoadingScreen from '@/app/loading-screen';
import packageJson from '@/../package.json';
import logger from '@/lib/logger';

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

export function AnimatedGridPattern({
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
          : sq,
      ),
    );
  };

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares));
    }
  }, [dimensions, numSquares]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
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
        'pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30',
        className,
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
              repeatType: 'reverse',
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

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = 'rgb(0, 0, 0)',
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
      if (typeof window === 'undefined') {
        return 'rgba(0, 0, 0,';
      }
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'rgba(255, 0, 0,';
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

      return {
        cols,
        rows,
        squares,
        dpr,
      };
    },
    [squareSize, gridGap, maxOpacity],
  );

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity],
  );

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number,
    ) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const opacity = squares[i * rows + j];
          ctx.fillStyle = `${memoizedColor}${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * dpr,
            j * (squareSize + gridGap) * dpr,
            squareSize * dpr,
            squareSize * dpr,
          );
        }
      }
    },
    [memoizedColor, squareSize, gridGap],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
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
        gridParams.dpr,
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
      { threshold: 0 },
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
    <div ref={containerRef} className={`h-full w-full ${className}`}>
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
    email: '',
    password: '',
    companyName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [organizations, setOrganizations] = useState<OneOfMulOrganization[]>(
    [],
  );
  const { user } = useSelector((state: any) => state.auth || {});
  const [loginFormValues, setLoginFormValues] = useState<LoginFormValues>();
  const [selectedOrg, setSelectedOrg] = useState<string>();
  const [isMultiple, setIsMultiple] = useState<boolean>(false);
  const [portalLogo, setPortalLogo] = useState<string | null>(null);
  const [portalLogoDark, setPortalLogoDark] = useState<string | null>(null);
  const [portalFavicon, setPortalFavicon] = useState<string | null>(null);
  const [portalName, setPortalName] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState<string>('#8b5cf6');
  // const [captcha, setCaptcha] = useState<string>();
  const [captcha, setCaptcha] = useState<string | null>(null); // Allow null for no CAPTCHA
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

  const {
    data: portalConfig,
    isLoading: isLoadingPortal,
    error: portalConfigError,
  } = useGetPortalConfigsQuery(undefined);

  const {
    data: orgResponse,
    isLoading: isOrgLoading,
    error: orgError,
  } = useFetchOrgQuery(undefined);

  useEffect(() => {
    if (user && user.id && user.role) {
      router.push('/dashboard');
    }
  }, [user]);

  // Decrypt siteKey when captchaConfig is available
  useEffect(() => {
    const decryptSiteKey = async () => {
      if (captchaConfig?.captcha?.siteKey) {
        // Use the organizationId from the first element of the orgResponse.data array
        const organizationId = orgResponse?.data?.[0]?.organizationId;
        if (!organizationId) {
          return;
        }

        const decrypted = await getDecodedCaptcha(
          captchaConfig.captcha.siteKey,
          organizationId,
        );
        if (decrypted) {
          setDecryptedSiteKey(decrypted);
        }
      }
    };
    decryptSiteKey();
  }, [captchaConfig, orgResponse?.data]);
  useEffect(() => {
    if (orgResponse?.portals?.length > 1) {
      setIsMultiple(true);
    }
  }, [orgResponse]);

  useEffect(() => {
    if (selectedOrg != '' && formData.email != '' && formData.password != '') {
      handleFormSubmit({
        preventDefault: () => {},
      } as unknown as React.FormEvent);
    }
  }, [selectedOrg]);

  // Fetch portal settings for logo and name
  useEffect(() => {
    if (!portalConfig) return;

    try {
      if (portalConfig.portalLogo?.url)
        setPortalLogo(portalConfig.portalLogo.url);
      if (portalConfig.portalLogoDark?.url)
        setPortalLogoDark(portalConfig.portalLogoDark.url);
      if (portalConfig.portalFavicon?.url) {
        setPortalFavicon(portalConfig.portalFavicon.url);
        const favicon = document.querySelector(
          "link[rel*='icon']",
        ) as HTMLLinkElement;
        if (favicon) {
          favicon.href = portalConfig.portalFavicon.url;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = portalConfig.portalFavicon.url;
          document.head.appendChild(newFavicon);
        }
      }
      if (portalConfig.primaryColor) setPrimaryColor(portalConfig.primaryColor);
      if (portalConfig.secondaryColor)
        setSecondaryColor(portalConfig.secondaryColor);
      if (portalConfig.portalName) {
        setPortalName(portalConfig.portalName);
        document.title = portalConfig.portalName;
      } else {
        document.title = 'HireTrack';
      }
    } catch (error) {
      logger.error('Error applying portal settings:', error);
      setPortalError(true);
      document.title = 'HireTrack';
    }
  }, [portalConfig]);

  // Get default logo based on theme
  const getDefaultLogo = () =>
    theme === 'dark' ? '/logo_dark.png' : '/logo.png';

  // Get logo URL with fallback
  const getLogoUrl = () => {
    // Only use default logo if portal fetch failed or no custom logo
    if (portalError || (!isLoadingPortal && !portalLogo && !portalLogoDark)) {
      return getDefaultLogo();
    }

    // Use appropriate logo based on theme
    if (theme === 'dark' && portalLogoDark) {
      return portalLogoDark;
    }
    if (portalLogo) {
      return portalLogo;
    }

    return '';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    setIsSubmitting(true);
    e.preventDefault();
    handleSubmit(
      {
        email: formData.email,
        password: formData.password,
      },
      setIsSubmitting,
      { setStatus: () => {} },
    );
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Apply portal colors to CSS custom properties
  useEffect(() => {
    if (!portalError && !isLoadingPortal) {
      document.documentElement.style.setProperty(
        '--portal-primary',
        primaryColor,
      );
      document.documentElement.style.setProperty(
        '--portal-secondary',
        secondaryColor,
      );
    }
  }, [primaryColor, secondaryColor, portalError, isLoadingPortal]);

  // Show loading indicator while fetching portal settings
  if (isLoadingPortal || isOrgLoading || isCaptchaLoading) {
    return <LoadingScreen />;
  }

  const appVersion = packageJson.version;

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.1}
          duration={3}
          repeatDelay={1}
          className={cx(
            '[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[-30%] h-[200%] skew-y-12',
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
        className="absolute left-1/4 top-1/4 h-72 w-72 animate-pulse rounded-full blur-3xl"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`,
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl delay-1000"
        style={{
          background: `linear-gradient(225deg, ${secondaryColor}15, ${primaryColor}15)`,
        }}
      />

      {/* Theme Toggle in top right corner */}
      <div
        className="absolute right-4 top-4"
        style={{
          zIndex: 999,
        }}
      >
        <ThemeToggle
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full border border-border bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background/90"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl items-center gap-8 lg:grid lg:grid-cols-2">
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6 space-y-6 text-center max-sm:-mt-4 lg:mb-0 lg:text-left"
        >
          <div className="space-y-6 max-sm:space-y-0">
            {/* Logo Section */}
            <div className="flex justify-center max-sm:pt-8 lg:justify-start">
              <div className="relative h-36 w-72 max-sm:w-64">
                <Image
                  src={getLogoUrl()}
                  alt={portalName || (portalError ? 'HireTrack' : '')}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold text-transparent lg:text-6xl">
              Smart Hiring
              <br />
              <span
                className="text-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  display: 'inline-block',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '100%',
                }}
              >
                Made Simple
              </span>
            </h1>

            <p className="mx-auto max-w-md text-lg text-muted-foreground max-sm:pt-4 lg:mx-0">
              Revolutionize your recruitment process with AI-powered candidate
              matching and intelligent screening.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
            {['AI Matching', 'Smart Screening', 'Analytics'].map(
              (feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 backdrop-blur-sm"
                >
                  <Sparkles
                    className="h-4 w-4"
                    style={{ color: primaryColor }}
                  />
                  <span className="text-sm">{feature}</span>
                </motion.div>
              ),
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
              className="pointer-events-none absolute h-96 w-96 rounded-full blur-3xl"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20, ${primaryColor}15)`,
                transform: `translate(${mousePosition.x - 192}px, ${mousePosition.y - 192}px)`,
              }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            />
          )}

          <div className="relative w-full justify-self-center rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-xl max-lg:w-[60vw] max-md:w-full">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold">Welcome </h2>

              {selectedOrg && (
                <div className="mt-2">
                  <span
                    className="cursor-pointer text-lg font-medium"
                    style={{
                      color: primaryColor,
                      animation: selectedOrg
                        ? 'fadeInOrg 0.9s ease-in-out forwards'
                        : 'none',
                    }}
                    onClick={() => {
                      setSelectedOrg('');
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
                    <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) =>
                        handleInputChange('companyName', e.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background/50 py-3 pl-10 pr-4 transition-all focus:border-current focus:outline-none focus:ring-2"
                      style={
                        {
                          '--tw-ring-color': `${primaryColor}50`,
                          '--tw-border-opacity': '1',
                        } as React.CSSProperties
                      }
                      onFocus={(e) =>
                        (e.target.style.borderColor = primaryColor)
                      }
                      onBlur={(e) => (e.target.style.borderColor = '')}
                      placeholder="Enter your company name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background/50 py-3 pl-10 pr-4 transition-all focus:border-current focus:outline-none focus:ring-2"
                    style={
                      {
                        '--tw-ring-color': `${primaryColor}50`,
                        '--tw-border-opacity': '1',
                      } as React.CSSProperties
                    }
                    onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                    onBlur={(e) => (e.target.style.borderColor = '')}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange('password', e.target.value)
                    }
                    className="w-full rounded-lg border border-border bg-background/50 py-3 pl-10 pr-12 transition-all focus:border-current focus:outline-none focus:ring-2"
                    style={
                      {
                        '--tw-ring-color': `${primaryColor}50`,
                        '--tw-border-opacity': '1',
                      } as React.CSSProperties
                    }
                    onFocus={(e) => (e.target.style.borderColor = primaryColor)}
                    onBlur={(e) => (e.target.style.borderColor = '')}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transform text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Conditionally render CAPTCHA if enabled and siteKey is available */}
              {captchaConfig?.captcha?.enableCaptcha && decryptedSiteKey && (
                <div className="flex justify-center">
                  <div className="recaptcha-container">
                    <ReCAPTCHA
                      sitekey={decryptedSiteKey}
                      onChange={(token) => setCaptcha(token)}
                      theme={theme as 'light' | 'dark'}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center space-x-2">
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
                disabled={
                  isLoading ||
                  isSubmitting ||
                  (captchaConfig?.captcha?.enableCaptcha && !captcha)
                }
                className="group relative w-full overflow-hidden rounded-lg py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-1000 group-hover:translate-x-[100%]" />
                {isLoading || isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
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
        className="pointer-events-none fixed bottom-2 right-4 z-50 select-none text-xs text-gray-400"
        aria-label="App Version"
      >
        v{appVersion}
      </div>
    </div>
  );
}
