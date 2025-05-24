/* ui/components/AgentSelector.tsx */
import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
} from "@mui/material";

type Props = {
  running: Record<string, string>; // agentId → jobId
  onStop: (agentId: string) => void;
};

export default function RunningList({ running, onStop }: Props) {
  const ids = Object.keys(running);
  if (ids.length === 0) return null;

  return (
    <Box sx={{ mt: 4, p: 2, bgcolor: "background.paper", borderRadius: 1 }}>
      <Typography variant="h6">Running Jobs</Typography>
      <List disablePadding>
        {ids.map((id) => (
          <ListItem
            key={id}
            secondaryAction={
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => onStop(id)}
              >
                Stop
              </Button>
            }
          >
            <ListItemText
              primary={id}
              secondary={running[id]}
              primaryTypographyProps={{ fontFamily: "monospace" }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
