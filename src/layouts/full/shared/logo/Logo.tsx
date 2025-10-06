import { FC, useContext } from 'react';
import { Link } from 'react-router';
import { styled } from '@mui/material';
import config from 'src/context/config';
import { CustomizerContext } from 'src/context/CustomizerContext';

interface LogoProps {
  mode?: 'light' | 'dark';
  width?: string;
  height?: string;
}

const StyledLogo = styled('img')<LogoProps>(({ width, height }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: width || '186px',
  height: height || 'auto',
}));

interface LogoProps {
  isLight?: boolean;
}

const Logo = ({ isLight }: LogoProps) => {
  const { isCollapse, isSidebarHover, activeDir, activeMode } = useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;
  
  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  }));

  const logoSrc = (activeMode === 'dark') || isLight
    ? '/src/assets/images/logos/lead_logo_main_white.svg' 
    : '/src/assets/images/logos/lead_logo_main_darkblue.svg';

  return (
    <LinkStyled to="/" style={{ display: 'flex', alignItems: 'center', maxWidth: '100%', justifyContent: 'flex-start'}}>
      <StyledLogo src={logoSrc} alt="Logo" />
    </LinkStyled>
  );
};

export default Logo;
