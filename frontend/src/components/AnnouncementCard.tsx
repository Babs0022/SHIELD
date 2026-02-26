'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Image from 'next/image';

interface AnnouncementCardProps {
  title?: string;
  description?: string;
  actionText?: string;
  actionLink?: string;
  onClose?: () => void;
  storageKey?: string;
  autoShow?: boolean;
}

const Card = styled.div<{ isVisible: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: 320px;
  background: rgba(20, 20, 25, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  z-index: 1000;
  transform: translateY(${props => props.isVisible ? '0' : '100px'});
  opacity: ${props => props.isVisible ? '1' : '0'};
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.05);

  @media (max-width: 480px) {
    left: 16px;
    right: 16px;
    width: auto;
    bottom: 16px;
  }
`;

const CardHeader = styled.div`
  position: relative;
  height: 120px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.2) 0%, transparent 50%);
    animation: shimmer 8s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    50% { transform: translate(-10px, -10px) rotate(5deg); }
  }
`;

const TokenLogo = styled.div`
  position: relative;
  z-index: 1;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
              0 0 0 2px rgba(255, 255, 255, 0.1);
  background: rgba(20, 20, 25, 0.8);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CardBody = styled.div`
  padding: 16px 20px 20px;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }
`;

const Title = styled.h4`
  font-size: 14px;
  font-weight: 600;
  color: white;
  margin: 0 0 6px 0;
  line-height: 1.3;
`;

const Description = styled.p`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 16px 0;
  line-height: 1.5;
`;

const ActionButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 16px;
  background: white;
  color: black;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-1px);
  }
`;

const HelpIcon = styled.div`
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  z-index: 999;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.9);
  }

  @media (max-width: 480px) {
    bottom: 16px;
    left: 16px;
  }
`;

export default function AnnouncementCard({
  title = 'NEW: $SHLD is live, on Base.',
  description = 'Discover the Shield token and its utility in the ecosystem.',
  actionText = 'Learn More',
  actionLink = 'https://shieldhq.xyz/token',
  onClose,
  storageKey = 'shield-features-announcement',
  autoShow = true,
}: AnnouncementCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    // Check if user has previously closed this announcement
    const hasBeenClosed = localStorage.getItem(storageKey);
    if (hasBeenClosed) {
      // User previously closed it, show the "?" button
      setIsClosed(true);
    } else if (autoShow) {
      // First time, show the card with delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey, autoShow]);

  const handleClose = () => {
    setIsVisible(false);
    setIsClosed(true);
    localStorage.setItem(storageKey, 'true');
    onClose?.();
  };

  const handleReopen = () => {
    localStorage.removeItem(storageKey);
    setIsClosed(false);
    setIsVisible(true);
  };

  if (isClosed) {
    return (
      <HelpIcon onClick={handleReopen} title="Show announcement">
        ?
      </HelpIcon>
    );
  }

  return (
    <Card isVisible={isVisible}>
      <CloseButton onClick={handleClose} aria-label="Close announcement">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </CloseButton>

      <CardHeader>
        <TokenLogo>
          <Image
            src="/$SHLD.png"
            alt="$SHLD Token"
            width={64}
            height={64}
            priority
          />
        </TokenLogo>
      </CardHeader>

      <CardBody>
        <Title>{title}</Title>
        <Description>{description}</Description>

        {actionText && actionLink && (
          <ActionButton href={actionLink} target="_blank" rel="noopener noreferrer">
            {actionText}
          </ActionButton>
        )}
      </CardBody>
    </Card>
  );
}
