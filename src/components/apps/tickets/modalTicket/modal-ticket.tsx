import { Dialog, DialogContent, DialogTitle } from "@mui/material"
import { Grid } from "@mui/system"
import { useState } from "react"
import CustomFormLabel from "src/components/forms/theme-elements/CustomFormLabel"
import CustomTextField from "src/components/forms/theme-elements/CustomTextField"

type ModalTicketProps = {
    show: boolean,
    close: (isOpen: boolean) => void,
}

const ModalTicket = (props: ModalTicketProps) => {
    const {show, close} = props;
    return (
        <Dialog
          open={show}
          onClose={() => close(false)}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          PaperProps={{ component: "form" }}
        >
          <DialogTitle id="alert-dialog-title">Заказ 2</DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                {/* Task title */}
                <CustomFormLabel sx={{ mt: 0 }} htmlFor="task">
                  Task Title
                </CustomFormLabel>
                <CustomTextField
                  id="task"
                  name="task"
                  variant="outlined"
                  fullWidth
                  value={0}
                  onChange={0}
                />
              </Grid>
            </Grid>
        </DialogContent>
        </Dialog>
    )
}

export default ModalTicket;
