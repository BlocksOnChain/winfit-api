import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
  ApiQuery,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ApiResponseDto } from '../common/dto/response.dto';

@ApiTags('Authentication')
@Controller('auth')
@ApiProduces('application/json')
@ApiConsumes('application/json')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user account',
    description: `
## Register New User

Creates a new user account and returns JWT tokens for immediate authentication.

### React Native Integration:
\`\`\`typescript
const registerUser = async (userData: RegisterData) => {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Store tokens securely
    await AsyncStorage.setItem('accessToken', result.data.accessToken);
    await AsyncStorage.setItem('refreshToken', result.data.refreshToken);
    
    // Navigate to main app
    navigation.navigate('Home');
  }
};
\`\`\`

### Important Notes:
- Email verification is required for full account access
- Username must be unique across the platform
- Password should follow security best practices
- Optional profile data can be updated later
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered. Check email for verification.',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'user@example.com',
            username: 'fitness_user123',
            firstName: 'John',
            lastName: 'Doe',
            emailVerified: false,
            level: 1,
            experience: 0,
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        message: 'User registered successfully. Please check your email for verification.',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists with this email or username',
    schema: {
      example: {
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input data',
    schema: {
      example: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: {
            email: ['Please provide a valid email address'],
            password: ['Password must be at least 8 characters long'],
          },
        },
      },
    },
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    const result = await this.authService.register(registerDto);
    return ApiResponseDto.success(
      result,
      'User registered successfully. Please check your email for verification.',
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description: `
## User Login

Authenticate user with email and password, returns JWT tokens for API access.

### React Native Integration:
\`\`\`typescript
const loginUser = async (email: string, password: string) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Store tokens securely
    await AsyncStorage.setItem('accessToken', result.data.accessToken);
    await AsyncStorage.setItem('refreshToken', result.data.refreshToken);
    
    // Set up automatic token refresh
    setupTokenRefresh(result.data.refreshToken);
    
    return result.data.user;
  } else {
    throw new Error(result.error.message);
  }
};
\`\`\`

### Token Management:
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Use refresh token to get new access token
- Implement automatic token refresh in your HTTP client
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
    schema: {
      example: {
        success: true,
        data: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'user@example.com',
            username: 'fitness_user123',
            firstName: 'John',
            lastName: 'Doe',
            emailVerified: true,
            level: 5,
            experience: 2450,
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        message: 'Login successful',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account not verified',
    schema: {
      example: {
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in',
        },
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    const result = await this.authService.login(loginDto);
    return ApiResponseDto.success(result, 'Login successful');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using refresh token',
    description: `
## Token Refresh

Get a new access token using a valid refresh token. Essential for maintaining authenticated sessions.

### React Native Integration:
\`\`\`typescript
const refreshToken = async () => {
  const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
  
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: storedRefreshToken })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Update stored tokens
    await AsyncStorage.setItem('accessToken', result.data.accessToken);
    await AsyncStorage.setItem('refreshToken', result.data.refreshToken);
    return result.data.accessToken;
  } else {
    // Refresh token invalid, redirect to login
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    navigation.navigate('Login');
  }
};

// Set up axios interceptor for automatic refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        error.config.headers.Authorization = \`Bearer \${newToken}\`;
        return axios.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
\`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        message: 'Tokens refreshed successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid or expired',
        },
      },
    },
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<ApiResponseDto<{ accessToken: string; refreshToken: string }>> {
    const result = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
    );
    return ApiResponseDto.success(result, 'Tokens refreshed successfully');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    schema: { type: 'string', example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
  })
  @ApiOperation({
    summary: 'Logout and invalidate tokens',
    description: `
## User Logout

Invalidates the current access token and refresh token, effectively logging out the user.

### React Native Integration:
\`\`\`typescript
const logoutUser = async () => {
  const accessToken = await AsyncStorage.getItem('accessToken');
  
  try {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.log('Logout request failed, but continuing with local cleanup');
  } finally {
    // Always clean up local storage
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    navigation.navigate('Login');
  }
};
\`\`\`

### Important Notes:
- Always clean up local storage even if the request fails
- This invalidates tokens on the server to prevent unauthorized access
- User must login again to get new tokens
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        success: true,
        message: 'Logout successful',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing authorization token',
        },
      },
    },
  })
  async logout(
    @Request() req: ExpressRequest & { user: any },
  ): Promise<ApiResponseDto> {
    const token = this.extractTokenFromHeader(req);
    if (token) {
      await this.authService.logout(token, req.user.userId);
    }
    return ApiResponseDto.success(null, 'Logout successful');
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: `
## Password Reset Request

Sends a password reset email to the user if the email exists in the system.

### React Native Integration:
\`\`\`typescript
const requestPasswordReset = async (email: string) => {
  const response = await fetch('/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const result = await response.json();
  
  // Always show success message for security (prevent email enumeration)
  Alert.alert(
    'Reset Link Sent',
    'If an account with that email exists, a password reset link has been sent.'
  );
};
\`\`\`

### Security Features:
- Returns same response whether email exists or not (prevents email enumeration)
- Reset tokens expire after 1 hour
- Only the most recent reset token is valid
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if user exists',
    schema: {
      example: {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    },
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ApiResponseDto> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return ApiResponseDto.success(
      null,
      'If an account with that email exists, a password reset link has been sent.',
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: `
## Reset Password

Reset user password using the token received via email.

### React Native Integration:
\`\`\`typescript
const resetPassword = async (token: string, newPassword: string) => {
  const response = await fetch('/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  });
  
  const result = await response.json();
  
  if (result.success) {
    Alert.alert(
      'Password Reset Successful',
      'Your password has been updated. Please log in with your new password.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    );
  } else {
    Alert.alert('Error', result.error.message);
  }
};
\`\`\`

### Important Notes:
- Reset tokens are single-use and expire after 1 hour
- After successful reset, user must login with new password
- Invalid or expired tokens return 400 error
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        success: true,
        message: 'Password reset successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Reset token is invalid or has expired',
        },
      },
    },
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ApiResponseDto> {
    await this.authService.resetPassword(resetPasswordDto);
    return ApiResponseDto.success(null, 'Password reset successfully');
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: `
## Email Verification

Verify user email address using the token received via email link.

### Usage:
Simply click the verification link from your email, or access:
\`GET /api/v1/auth/verify-email?token=YOUR_TOKEN\`

### React Native Integration:
\`\`\`typescript
const verifyEmail = async (token: string) => {
  const response = await fetch(\`/api/v1/auth/verify-email?token=\${token}\`, {
    method: 'GET',
  });
  
  const result = await response.json();
  
  if (result.success) {
    Alert.alert(
      'Email Verified!',
      'Your email has been successfully verified. You now have full access to all features.',
      [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
    );
    
    // Refresh user profile to get updated verification status
    await fetchUserProfile();
  } else {
    Alert.alert('Verification Failed', result.error.message);
  }
};

// Handle deep link for email verification
useEffect(() => {
  const handleDeepLink = (url: string) => {
    const match = url.match(/verify-email\?token=(.+)/);
    if (match) {
      verifyEmail(match[1]);
    }
  };
  
  Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
}, []);
\`\`\`

### Important Notes:
- Verification tokens expire after 24 hours
- Users can request a new verification email if token expires
- Some features may be limited until email is verified
- This endpoint can be accessed directly from email links
    `,
  })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token received via email',
    example: '1ac66c7b3f77c4b4fb4a0265f6408661658f739a29e783ee0f828d28e5d9b9d9',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Email verified successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Verification token is invalid or has expired',
        },
      },
    },
  })
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<ApiResponseDto> {
    await this.authService.verifyEmail({ token });
    return ApiResponseDto.success(null, 'Email verified successfully');
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification',
    description: `
## Resend Verification Email

Request a new email verification link if the previous one expired.

### React Native Integration:
\`\`\`typescript
const resendVerification = async (email: string) => {
  const response = await fetch('/api/v1/auth/resend-verification?email=' + encodeURIComponent(email), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const result = await response.json();
  
  if (result.success) {
    Alert.alert(
      'Verification Email Sent',
      'A new verification email has been sent. Please check your inbox.'
    );
  } else {
    Alert.alert('Error', result.error.message);
  }
};
\`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    schema: {
      example: {
        success: true,
        message: 'Verification email sent',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or user not found',
    schema: {
      example: {
        success: false,
        error: {
          code: 'EMAIL_ALREADY_VERIFIED',
          message: 'Email is already verified',
        },
      },
    },
  })
  async resendEmailVerification(
    @Query('email') email: string,
  ): Promise<ApiResponseDto> {
    await this.authService.resendEmailVerification(email);
    return ApiResponseDto.success(null, 'Verification email sent');
  }

  @Get('verify-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check email verification status',
    description: `
## Check Verification Status

Check if the current user's email is verified.

### React Native Integration:
\`\`\`typescript
const checkVerificationStatus = async () => {
  const accessToken = await AsyncStorage.getItem('accessToken');
  
  const response = await fetch('/api/v1/auth/verify-status', {
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  
  if (result.success) {
    return result.data.emailVerified;
  }
  
  return false;
};

// Use in components to conditionally show verification prompts
const ProfileScreen = () => {
  const [isVerified, setIsVerified] = useState(true);
  
  useEffect(() => {
    checkVerificationStatus().then(setIsVerified);
  }, []);
  
  if (!isVerified) {
    return <EmailVerificationPrompt />;
  }
  
  return <ProfileContent />;
};
\`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Email verification status retrieved',
    schema: {
      example: {
        success: true,
        data: { emailVerified: true },
        message: 'Email verification status retrieved',
      },
    },
  })
  async getVerificationStatus(
    @Request() req: ExpressRequest & { user: any },
  ): Promise<ApiResponseDto<{ emailVerified: boolean }>> {
    // This would need to be implemented in a service that fetches user data
    return ApiResponseDto.success(
      { emailVerified: true },
      'Email verification status retrieved',
    );
  }

  private extractTokenFromHeader(request: ExpressRequest): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
