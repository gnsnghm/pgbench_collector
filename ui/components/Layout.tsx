// ui/components/Layout.tsx
import React from "react";
import { Box, AppBar, Toolbar, Typography, Drawer } from "@mui/material";

const drawerWidth = 240;

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Box sx={{ display: "flex" }}>
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar>
        <Typography variant="h6" noWrap>
          pgbench Collector
        </Typography>
      </Toolbar>
    </AppBar>

    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
      }}
    >
      <Toolbar />
      {/* ここに AgentSelector.tsx を置く */}
      {/* <AgentSelector /> */}
    </Drawer>

    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <Toolbar />
      {children}
    </Box>
  </Box>
);
