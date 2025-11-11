import { useState } from "react";
import {
  Grid,
  Typography,
  Breadcrumbs,
  Link,
  Box,
  Theme,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { NavLink } from "react-router-dom";
import { IconCircle } from "@tabler/icons-react";
import { useAppDispatch, useAppSelector } from "src/store/hooks";
import { selectOrdersType } from "src/store/selectors/ticketsSelectors";
import { updateOrdersType } from "src/store/slices/ticketsSlice";
import { fetchUserOrders } from "src/store/middleware/thunks/ordersThunks";
import { fetchMessages } from "src/store/middleware/thunks/messageThunks";

interface BreadCrumbItem {
  title: string;
  to?: string;
}

interface BreadCrumbType {
  subtitle?: string;
  items?: BreadCrumbItem[];
  title: string;
  children?: React.ReactNode;
}

const Breadcrumb = ({ subtitle, items, title, children }: BreadCrumbType) => {
  const dispatch = useAppDispatch();
  const orderView = useAppSelector(selectOrdersType);
  const setOrderView = (value: 'my' | 'all') => dispatch(updateOrdersType(value)); 

  const handleChange = (
    _: React.MouseEvent<HTMLElement>,
    newView: "my" | "all" | null
  ) => {
    if (newView){
      setOrderView(newView)
      dispatch(fetchUserOrders());
      dispatch(fetchMessages('123'));
    };
  };

  return (
    <Grid
      container
      sx={{
        background: "linear-gradient(90deg, #26428B 0%, #2E57B5 100%)",
        color: "#fff",
        borderRadius: (theme: Theme) => theme.shape.borderRadius / 4,
        p: "30px 25px 20px",
        marginBottom: "30px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Grid item mb={1} xs={12}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h4">{title}</Typography>

          {/* Переключатель */}
          <ToggleButtonGroup
            value={orderView}
            exclusive
            onChange={handleChange}
            sx={{
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: "50px",
              overflow: "hidden",
              "& .MuiToggleButton-root": {
                color: "#fff",
                border: "none",
                textTransform: "none",
                px: 2.5,
                py: 0.7,
                fontSize: "0.9rem",
                fontWeight: 500,
                transition: "all 0.3s ease",
                "&.Mui-selected": {
                  backgroundColor: "#fff",
                  color: "#2E57B5",
                },
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.25)",
                },
              },
            }}
          >
            <ToggleButton value="my">Мои заказы</ToggleButton>
            <ToggleButton value="all">Все заказы</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography
          color="textSecondary"
          variant="h6"
          fontWeight={400}
          mt={0.8}
          mb={0}
        >
          {subtitle}
        </Typography>

        <Breadcrumbs
          separator={
            <IconCircle
              size="5"
              fill="textSecondary"
              fillOpacity={"0.6"}
              style={{ margin: "0 5px" }}
            />
          }
          sx={{ alignItems: "center", mt: items ? "10px" : "" }}
          aria-label="breadcrumb"
        >
          {items
            ? items.map((item) => (
                <div key={item.title}>
                  {item.to ? (
                    <Link
                      underline="none"
                      color="inherit"
                      component={NavLink}
                      to={item.to}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <Typography color="textPrimary">{item.title}</Typography>
                  )}
                </div>
              ))
            : ""}
        </Breadcrumbs>
      </Grid>

      <Grid
        item
        display="flex"
        alignItems="flex-end"
        xs={12}
        sm={6}
        lg={4}
      >
        <Box
          sx={{
            display: { xs: "none", md: "block", lg: "flex" },
            alignItems: "center",
            justifyContent: "flex-end",
            width: "100%",
          }}
        >
          {children ? (
            <Box sx={{ top: "0px", position: "absolute" }}>{children}</Box>
          ) : null}
        </Box>
      </Grid>
    </Grid>
  );
};

export default Breadcrumb;
