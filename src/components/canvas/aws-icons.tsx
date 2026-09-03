"use client";

import React from 'react';
import type { AWSServiceCategory } from '@/lib/canvas/types';

export interface AWSIconProps {
  size?: number;
  className?: string;
}

// ---------------------------------------------------------
// COMPUTE (Orange #FF9900)
// ---------------------------------------------------------

export const EC2Icon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FF9900" />
    <rect x="12" y="12" width="16" height="16" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <circle cx="20" cy="20" r="2" fill="white" />
  </svg>
);

export const LambdaIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FF9900" />
    <path d="M15 28 L20 12 L28 28 M20 12 L20 28" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ECSIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FF9900" />
    <rect x="10" y="16" width="6" height="8" fill="white" />
    <rect x="17" y="16" width="6" height="8" fill="white" />
    <rect x="24" y="16" width="6" height="8" fill="white" />
    <path d="M10 12 L30 12 M10 28 L30 28" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const EKSIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FF9900" />
    <circle cx="20" cy="20" r="7" fill="none" stroke="white" strokeWidth="2" />
    <circle cx="20" cy="10" r="3" fill="white" />
    <circle cx="11" cy="25" r="3" fill="white" />
    <circle cx="29" cy="25" r="3" fill="white" />
    <path d="M20 13 L20 18 M13 23 L16 20 M27 23 L24 20" stroke="white" strokeWidth="2" />
  </svg>
);

export const FargateIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FF9900" />
    <path d="M10 14h20v12H10z" fill="none" stroke="white" strokeWidth="2" />
    <path d="M14 20l4-4 4 4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ElasticBeanstalkIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#FF9900" />
    <path d="M16 28V12l8 8-8 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------
// STORAGE (Green #3F8624)
// ---------------------------------------------------------

export const S3Icon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3F8624" />
    <path d="M12 16c0-2.2 3.6-4 8-4s8 1.8 8 4v8c0 2.2-3.6 4-8 4s-8-1.8-8-4v-8z" fill="none" stroke="white" strokeWidth="2" />
    <path d="M12 16c0 2.2 3.6 4 8 4s8-1.8 8-4M12 20c0 2.2 3.6 4 8 4s8-1.8 8-4" fill="none" stroke="white" strokeWidth="2" />
  </svg>
);

export const EBSIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3F8624" />
    <rect x="10" y="12" width="20" height="16" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <line x1="14" y1="20" x2="16" y2="20" stroke="white" strokeWidth="2" />
  </svg>
);

export const EFSIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3F8624" />
    <path d="M10 20h20M12 14h16M12 26h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="16" cy="20" r="2" fill="white" />
    <circle cx="24" cy="20" r="2" fill="white" />
  </svg>
);

export const GlacierIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3F8624" />
    <path d="M20 10l8 20H12l8-20z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <path d="M14 24h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------
// DATABASE (Blue #3B48CC)
// ---------------------------------------------------------

export const RDSIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3B48CC" />
    <path d="M14 12h12v16H14z" fill="none" stroke="white" strokeWidth="2" />
    <path d="M14 16h12M14 20h12M14 24h12" stroke="white" strokeWidth="2" />
  </svg>
);

export const DynamoDBIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3B48CC" />
    <path d="M12 20l8-8 8 8-8 8-8-8z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="20" cy="20" r="3" fill="white" />
  </svg>
);

export const AuroraIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3B48CC" />
    <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="2" />
    <path d="M16 20a4 4 0 018 0" stroke="white" strokeWidth="2" fill="none" />
  </svg>
);

export const ElastiCacheIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3B48CC" />
    <rect x="12" y="10" width="16" height="6" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <rect x="12" y="17" width="16" height="6" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <rect x="12" y="24" width="16" height="6" rx="2" fill="none" stroke="white" strokeWidth="2" />
  </svg>
);

export const RedshiftIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3B48CC" />
    <polygon points="20,10 30,15 30,25 20,30 10,25 10,15" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="20" cy="20" r="3" fill="white" />
  </svg>
);

export const DocumentDBIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#3B48CC" />
    <path d="M12 10h12l4 4v16H12z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <path d="M16 16h8M16 20h8M16 24h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------
// NETWORKING (Purple #8C4FFF)
// ---------------------------------------------------------

export const VPCIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#8C4FFF" />
    <path d="M14 22a4 4 0 010-8h1a6 6 0 0110 0h1a4 4 0 010 8z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const CloudFrontIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#8C4FFF" />
    <circle cx="20" cy="20" r="4" fill="none" stroke="white" strokeWidth="2" />
    <circle cx="20" cy="10" r="2" fill="white" />
    <circle cx="10" cy="25" r="2" fill="white" />
    <circle cx="30" cy="25" r="2" fill="white" />
    <path d="M20 14L20 16 M13 23L16 21 M27 23L24 21" stroke="white" strokeWidth="2" />
  </svg>
);

export const Route53Icon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#8C4FFF" />
    <path d="M10 20l6-8 8 16 6-8" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const APIGatewayIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#8C4FFF" />
    <rect x="14" y="10" width="12" height="20" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <path d="M14 16h12 M14 24h12" stroke="white" strokeWidth="2" />
  </svg>
);

export const ELBIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#8C4FFF" />
    <path d="M10 20h6 M24 20h6 M20 10v6 M20 24v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="20" cy="20" r="4" fill="none" stroke="white" strokeWidth="2" />
  </svg>
);

export const DirectConnectIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#8C4FFF" />
    <rect x="12" y="16" width="16" height="8" rx="4" fill="none" stroke="white" strokeWidth="2" />
    <path d="M8 20h4 M28 20h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------
// SECURITY (Red #DD344C)
// ---------------------------------------------------------

export const IAMIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#DD344C" />
    <path d="M20 10L12 14v6c0 5 3 9.5 8 11.5 5-2 8-6.5 8-11.5v-6l-8-4z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="20" cy="18" r="2" fill="white" />
    <path d="M20 20v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const KMSIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#DD344C" />
    <circle cx="16" cy="24" r="4" fill="none" stroke="white" strokeWidth="2" />
    <path d="M19 21l7-7h4v4h-2v2h-2l-3 3" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

export const SecretsManagerIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#DD344C" />
    <rect x="12" y="18" width="16" height="12" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <path d="M16 18v-4a4 4 0 018 0v4" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const WAFIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#DD344C" />
    <path d="M12 12v16h16V12H12z" fill="none" stroke="white" strokeWidth="2" />
    <path d="M12 20h16M20 12v16" stroke="white" strokeWidth="2" strokeDasharray="2 2" />
  </svg>
);

export const ShieldIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#DD344C" />
    <path d="M20 10l-8 4v6c0 6 4 10 8 12 4-2 8-6 8-12v-6l-8-4z" fill="white" />
  </svg>
);

export const CognitoIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#DD344C" />
    <circle cx="20" cy="16" r="4" fill="none" stroke="white" strokeWidth="2" />
    <path d="M12 28c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CertificateManagerIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#DD344C" />
    <circle cx="20" cy="16" r="6" fill="none" stroke="white" strokeWidth="2" />
    <path d="M18 21v6l2 2 2-2v-6" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------
// INTEGRATION (Pink #E7157B)
// ---------------------------------------------------------

export const SQSIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <rect x="10" y="16" width="20" height="8" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <path d="M14 20h4M22 20h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const SNSIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <circle cx="20" cy="20" r="3" fill="white" />
    <circle cx="12" cy="12" r="2" fill="white" />
    <circle cx="28" cy="12" r="2" fill="white" />
    <circle cx="12" cy="28" r="2" fill="white" />
    <circle cx="28" cy="28" r="2" fill="white" />
    <path d="M14 14l4 4M26 14l-4 4M14 26l4-4M26 26l-4-4" stroke="white" strokeWidth="2" />
  </svg>
);

export const EventBridgeIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <path d="M12 20h16M20 12l8 8-8 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="20" r="2" fill="white" />
  </svg>
);

export const StepFunctionsIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <path d="M20 10v6M20 24v6M14 20h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <rect x="17" y="16" width="6" height="8" rx="1" fill="none" stroke="white" strokeWidth="2" />
  </svg>
);

export const MQIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <path d="M12 14v12h16V14H12z" fill="none" stroke="white" strokeWidth="2" />
    <path d="M16 18h8M16 22h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------
// MANAGEMENT (Pink-Red #E7157B)
// ---------------------------------------------------------

export const CloudWatchIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <path d="M10 20c0 0 4-6 10-6s10 6 10 6-4 6-10 6-10-6-10-6z" fill="none" stroke="white" strokeWidth="2" />
    <circle cx="20" cy="20" r="3" fill="white" />
  </svg>
);

export const CloudTrailIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <path d="M12 28c4-8 12-4 16-12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="28" r="2" fill="white" />
    <circle cx="28" cy="16" r="2" fill="white" />
  </svg>
);

export const CloudFormationIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <polygon points="20,10 30,16 20,22 10,16" fill="none" stroke="white" strokeWidth="2" />
    <polygon points="20,18 30,24 20,30 10,24" fill="none" stroke="white" strokeWidth="2" />
  </svg>
);

export const SystemsManagerIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#E7157B" />
    <rect x="14" y="14" width="12" height="12" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <path d="M20 10v4M20 26v4M10 20h4M26 20h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------
// AI/ML (Green #01A88D)
// ---------------------------------------------------------

export const SageMakerIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#01A88D" />
    <path d="M12 24l8-8 8 8" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx="20" cy="16" r="2" fill="white" />
  </svg>
);

export const BedrockIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#01A88D" />
    <rect x="12" y="22" width="16" height="6" rx="1" fill="none" stroke="white" strokeWidth="2" />
    <rect x="14" y="14" width="12" height="6" rx="1" fill="none" stroke="white" strokeWidth="2" />
    <rect x="16" y="6" width="8" height="6" rx="1" fill="white" />
  </svg>
);

export const RekognitionIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#01A88D" />
    <rect x="12" y="12" width="16" height="16" rx="2" fill="none" stroke="white" strokeWidth="2" />
    <path d="M12 16h4M24 16h4M12 24h4M24 24h4M16 12v4M24 12v4M16 28v-4M24 28v-4" stroke="white" strokeWidth="1" />
  </svg>
);

export const ComprehendIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="8" fill="#01A88D" />
    <path d="M12 16h16M12 24h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <circle cx="26" cy="24" r="2" fill="white" />
  </svg>
);


// ---------------------------------------------------------
// AWS LOGO ICON
// ---------------------------------------------------------
export const AWSLogoIcon: React.FC<AWSIconProps> = ({ size = 32, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 24c4 4 12 4 16 0" fill="none" stroke="#FF9900" strokeWidth="3" strokeLinecap="round" />
    <path d="M26 24l2-4m-2 4h-4" fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------
// CATEGORY REGISTRY
// ---------------------------------------------------------

export const AWS_CATEGORIES: Record<AWSServiceCategory, { label: string; color: string; bgColor: string }> = {
  compute: { label: 'Compute', color: '#FF9900', bgColor: 'bg-[#FF9900]' },
  storage: { label: 'Storage', color: '#3F8624', bgColor: 'bg-[#3F8624]' },
  database: { label: 'Database', color: '#3B48CC', bgColor: 'bg-[#3B48CC]' },
  networking: { label: 'Networking & Content Delivery', color: '#8C4FFF', bgColor: 'bg-[#8C4FFF]' },
  security: { label: 'Security, Identity, & Compliance', color: '#DD344C', bgColor: 'bg-[#DD344C]' },
  integration: { label: 'Application Integration', color: '#E7157B', bgColor: 'bg-[#E7157B]' },
  management: { label: 'Management & Governance', color: '#E7157B', bgColor: 'bg-[#E7157B]' },
  ai_ml: { label: 'Machine Learning & AI', color: '#01A88D', bgColor: 'bg-[#01A88D]' },
  ml: { label: 'Machine Learning', color: '#01A88D', bgColor: 'bg-[#01A88D]' },
  analytics: { label: 'Analytics', color: '#8C4FFF', bgColor: 'bg-[#8C4FFF]' },
  serverless: { label: 'Serverless', color: '#FF9900', bgColor: 'bg-[#FF9900]' },
  containers: { label: 'Containers', color: '#FF9900', bgColor: 'bg-[#FF9900]' },
  'front-end': { label: 'Front-end Web & Mobile', color: '#DD344C', bgColor: 'bg-[#DD344C]' },
  iot: { label: 'Internet of Things', color: '#3F8624', bgColor: 'bg-[#3F8624]' },
  mobile: { label: 'Mobile', color: '#DD344C', bgColor: 'bg-[#DD344C]' }
};

export interface AWSServiceDef {
  id: string;
  name: string;
  shortName: string;
  category: AWSServiceCategory;
  icon: React.ComponentType<AWSIconProps>;
  description: string;
  defaultConfig: Record<string, string>;
}

// ---------------------------------------------------------
// SERVICE REGISTRY
// ---------------------------------------------------------

export const AWS_SERVICE_REGISTRY: Record<string, AWSServiceDef> = {
  // COMPUTE
  ec2: {
    id: 'ec2',
    name: 'Amazon Elastic Compute Cloud',
    shortName: 'EC2',
    category: 'compute',
    icon: EC2Icon,
    description: 'Virtual servers in the cloud',
    defaultConfig: { instanceType: 't3.micro' },
  },
  lambda: {
    id: 'lambda',
    name: 'AWS Lambda',
    shortName: 'Lambda',
    category: 'compute',
    icon: LambdaIcon,
    description: 'Run code without thinking about servers',
    defaultConfig: { runtime: 'nodejs20.x', memory: '128' },
  },
  ecs: {
    id: 'ecs',
    name: 'Amazon Elastic Container Service',
    shortName: 'ECS',
    category: 'compute',
    icon: ECSIcon,
    description: 'Highly secure, reliable, and scalable way to run containers',
    defaultConfig: { launchType: 'FARGATE' },
  },
  eks: {
    id: 'eks',
    name: 'Amazon Elastic Kubernetes Service',
    shortName: 'EKS',
    category: 'compute',
    icon: EKSIcon,
    description: 'Managed Kubernetes service',
    defaultConfig: { version: '1.29' },
  },
  fargate: {
    id: 'fargate',
    name: 'AWS Fargate',
    shortName: 'Fargate',
    category: 'compute',
    icon: FargateIcon,
    description: 'Serverless compute for containers',
    defaultConfig: { cpu: '256', memory: '512' },
  },
  elasticbeanstalk: {
    id: 'elasticbeanstalk',
    name: 'AWS Elastic Beanstalk',
    shortName: 'Elastic Beanstalk',
    category: 'compute',
    icon: ElasticBeanstalkIcon,
    description: 'Run and manage web apps',
    defaultConfig: { platform: 'Node.js' },
  },

  // STORAGE
  s3: {
    id: 's3',
    name: 'Amazon Simple Storage Service',
    shortName: 'S3',
    category: 'storage',
    icon: S3Icon,
    description: 'Scalable storage in the cloud',
    defaultConfig: { versioning: 'enabled', encryption: 'AES256' },
  },
  ebs: {
    id: 'ebs',
    name: 'Amazon Elastic Block Store',
    shortName: 'EBS',
    category: 'storage',
    icon: EBSIcon,
    description: 'EC2 block storage volumes',
    defaultConfig: { volumeType: 'gp3', size: '20' },
  },
  efs: {
    id: 'efs',
    name: 'Amazon Elastic File System',
    shortName: 'EFS',
    category: 'storage',
    icon: EFSIcon,
    description: 'Managed file storage for EC2',
    defaultConfig: { performanceMode: 'generalPurpose' },
  },
  glacier: {
    id: 'glacier',
    name: 'Amazon S3 Glacier',
    shortName: 'Glacier',
    category: 'storage',
    icon: GlacierIcon,
    description: 'Low-cost archive storage in the cloud',
    defaultConfig: { retrievalTier: 'Standard' },
  },

  // DATABASE
  rds: {
    id: 'rds',
    name: 'Amazon Relational Database Service',
    shortName: 'RDS',
    category: 'database',
    icon: RDSIcon,
    description: 'Managed relational database service',
    defaultConfig: { engine: 'postgres', instanceClass: 'db.t3.micro' },
  },
  dynamodb: {
    id: 'dynamodb',
    name: 'Amazon DynamoDB',
    shortName: 'DynamoDB',
    category: 'database',
    icon: DynamoDBIcon,
    description: 'Fast and flexible NoSQL database service',
    defaultConfig: { billingMode: 'PAY_PER_REQUEST' },
  },
  aurora: {
    id: 'aurora',
    name: 'Amazon Aurora',
    shortName: 'Aurora',
    category: 'database',
    icon: AuroraIcon,
    description: 'High performance managed relational database',
    defaultConfig: { engine: 'aurora-postgresql' },
  },
  elasticache: {
    id: 'elasticache',
    name: 'Amazon ElastiCache',
    shortName: 'ElastiCache',
    category: 'database',
    icon: ElastiCacheIcon,
    description: 'In-memory caching service',
    defaultConfig: { engine: 'redis' },
  },
  redshift: {
    id: 'redshift',
    name: 'Amazon Redshift',
    shortName: 'Redshift',
    category: 'database',
    icon: RedshiftIcon,
    description: 'Fast, simple, cost-effective data warehousing',
    defaultConfig: { nodeType: 'dc2.large' },
  },
  documentdb: {
    id: 'documentdb',
    name: 'Amazon DocumentDB',
    shortName: 'DocumentDB',
    category: 'database',
    icon: DocumentDBIcon,
    description: 'Fully managed document database',
    defaultConfig: { instanceClass: 'db.r5.large' },
  },

  // NETWORKING
  vpc: {
    id: 'vpc',
    name: 'Amazon Virtual Private Cloud',
    shortName: 'VPC',
    category: 'networking',
    icon: VPCIcon,
    description: 'Isolated cloud resources',
    defaultConfig: { cidrBlock: '10.0.0.0/16' },
  },
  cloudfront: {
    id: 'cloudfront',
    name: 'Amazon CloudFront',
    shortName: 'CloudFront',
    category: 'networking',
    icon: CloudFrontIcon,
    description: 'Global content delivery network',
    defaultConfig: { priceClass: 'PriceClass_100' },
  },
  route53: {
    id: 'route53',
    name: 'Amazon Route 53',
    shortName: 'Route 53',
    category: 'networking',
    icon: Route53Icon,
    description: 'Scalable DNS and domain name registration',
    defaultConfig: { type: 'A' },
  },
  apigateway: {
    id: 'apigateway',
    name: 'Amazon API Gateway',
    shortName: 'API Gateway',
    category: 'networking',
    icon: APIGatewayIcon,
    description: 'Build, deploy, and manage APIs',
    defaultConfig: { endpointType: 'REGIONAL' },
  },
  elb: {
    id: 'elb',
    name: 'Elastic Load Balancing',
    shortName: 'ELB',
    category: 'networking',
    icon: ELBIcon,
    description: 'Distribute incoming traffic across targets',
    defaultConfig: { type: 'application' },
  },
  directconnect: {
    id: 'directconnect',
    name: 'AWS Direct Connect',
    shortName: 'Direct Connect',
    category: 'networking',
    icon: DirectConnectIcon,
    description: 'Dedicated network connection to AWS',
    defaultConfig: { bandwidth: '1Gbps' },
  },

  // SECURITY
  iam: {
    id: 'iam',
    name: 'AWS Identity and Access Management',
    shortName: 'IAM',
    category: 'security',
    icon: IAMIcon,
    description: 'Manage access to AWS resources',
    defaultConfig: {},
  },
  kms: {
    id: 'kms',
    name: 'AWS Key Management Service',
    shortName: 'KMS',
    category: 'security',
    icon: KMSIcon,
    description: 'Managed creation and control of encryption keys',
    defaultConfig: { keySpec: 'SYMMETRIC_DEFAULT' },
  },
  secretsmanager: {
    id: 'secretsmanager',
    name: 'AWS Secrets Manager',
    shortName: 'Secrets Manager',
    category: 'security',
    icon: SecretsManagerIcon,
    description: 'Rotate, manage, and retrieve secrets',
    defaultConfig: {},
  },
  waf: {
    id: 'waf',
    name: 'AWS WAF',
    shortName: 'WAF',
    category: 'security',
    icon: WAFIcon,
    description: 'Web application firewall',
    defaultConfig: { scope: 'REGIONAL' },
  },
  shield: {
    id: 'shield',
    name: 'AWS Shield',
    shortName: 'Shield',
    category: 'security',
    icon: ShieldIcon,
    description: 'DDoS protection',
    defaultConfig: { tier: 'Standard' },
  },
  cognito: {
    id: 'cognito',
    name: 'Amazon Cognito',
    shortName: 'Cognito',
    category: 'security',
    icon: CognitoIcon,
    description: 'Identity management for your apps',
    defaultConfig: { type: 'UserPool' },
  },
  certificatemanager: {
    id: 'certificatemanager',
    name: 'AWS Certificate Manager',
    shortName: 'ACM',
    category: 'security',
    icon: CertificateManagerIcon,
    description: 'Provision, manage, and deploy SSL/TLS certificates',
    defaultConfig: { validationMethod: 'DNS' },
  },

  // INTEGRATION
  sqs: {
    id: 'sqs',
    name: 'Amazon Simple Queue Service',
    shortName: 'SQS',
    category: 'integration',
    icon: SQSIcon,
    description: 'Managed message queues',
    defaultConfig: { type: 'standard' },
  },
  sns: {
    id: 'sns',
    name: 'Amazon Simple Notification Service',
    shortName: 'SNS',
    category: 'integration',
    icon: SNSIcon,
    description: 'Pub/sub, SMS, email, and mobile push notifications',
    defaultConfig: { type: 'standard' },
  },
  eventbridge: {
    id: 'eventbridge',
    name: 'Amazon EventBridge',
    shortName: 'EventBridge',
    category: 'integration',
    icon: EventBridgeIcon,
    description: 'Serverless event bus',
    defaultConfig: {},
  },
  stepfunctions: {
    id: 'stepfunctions',
    name: 'AWS Step Functions',
    shortName: 'Step Functions',
    category: 'integration',
    icon: StepFunctionsIcon,
    description: 'Coordinate distributed applications',
    defaultConfig: { type: 'STANDARD' },
  },
  mq: {
    id: 'mq',
    name: 'Amazon MQ',
    shortName: 'MQ',
    category: 'integration',
    icon: MQIcon,
    description: 'Managed message broker for ActiveMQ and RabbitMQ',
    defaultConfig: { engine: 'RabbitMQ' },
  },

  // MANAGEMENT
  cloudwatch: {
    id: 'cloudwatch',
    name: 'Amazon CloudWatch',
    shortName: 'CloudWatch',
    category: 'management',
    icon: CloudWatchIcon,
    description: 'Monitor resources and applications',
    defaultConfig: {},
  },
  cloudtrail: {
    id: 'cloudtrail',
    name: 'AWS CloudTrail',
    shortName: 'CloudTrail',
    category: 'management',
    icon: CloudTrailIcon,
    description: 'Track user activity and API usage',
    defaultConfig: { multiRegion: 'true' },
  },
  cloudformation: {
    id: 'cloudformation',
    name: 'AWS CloudFormation',
    shortName: 'CloudFormation',
    category: 'management',
    icon: CloudFormationIcon,
    description: 'Create and manage resources with templates',
    defaultConfig: {},
  },
  systemsmanager: {
    id: 'systemsmanager',
    name: 'AWS Systems Manager',
    shortName: 'Systems Manager',
    category: 'management',
    icon: SystemsManagerIcon,
    description: 'Gain operational insights and take action',
    defaultConfig: {},
  },

  // AI/ML
  sagemaker: {
    id: 'sagemaker',
    name: 'Amazon SageMaker',
    shortName: 'SageMaker',
    category: 'ml',
    icon: SageMakerIcon,
    description: 'Build, train, and deploy machine learning models',
    defaultConfig: {},
  },
  bedrock: {
    id: 'bedrock',
    name: 'Amazon Bedrock',
    shortName: 'Bedrock',
    category: 'ml',
    icon: BedrockIcon,
    description: 'Build and scale generative AI applications',
    defaultConfig: {},
  },
  rekognition: {
    id: 'rekognition',
    name: 'Amazon Rekognition',
    shortName: 'Rekognition',
    category: 'ml',
    icon: RekognitionIcon,
    description: 'Analyze image and video',
    defaultConfig: {},
  },
  comprehend: {
    id: 'comprehend',
    name: 'Amazon Comprehend',
    shortName: 'Comprehend',
    category: 'ml',
    icon: ComprehendIcon,
    description: 'Discover insights and relationships in text',
    defaultConfig: {},
  },
};

export function getServicesByCategory(category: AWSServiceCategory): AWSServiceDef[] {
  return Object.values(AWS_SERVICE_REGISTRY).filter((service) => service.category === category);
}

export interface AwsIconProps extends AWSIconProps {
  serviceId: string;
}

export const AwsIcon: React.FC<AwsIconProps> = ({ serviceId, size = 32, className = "" }) => {
  const service = AWS_SERVICE_REGISTRY[serviceId?.toLowerCase()];
  if (service?.icon) {
    const IconComponent = service.icon;
    return <IconComponent size={size} className={className} />;
  }
  return <AWSLogoIcon size={size} className={className} />;
};
