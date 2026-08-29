import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import Home from "./pages/Home";
import FpoStudio from "./pages/FpoStudio";
import Impact from "./pages/Impact";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";
import Operations from "./pages/Operations";
import TraceLot from "./pages/TraceLot";
import DriverPortal from "./pages/DriverPortal";
import DisputesManagement from "./pages/DisputesManagement";
import TelemetryDashboard from "./pages/TelemetryDashboard";
import FarmerPortal from "./pages/FarmerPortal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/operations" component={Operations} />
      <Route path="/fpo-studio" component={FpoStudio} />
      <Route path="/farmer" component={FarmerPortal} />
      <Route path="/driver" component={DriverPortal} />
      <Route path="/telemetry" component={TelemetryDashboard} />
      <Route path="/disputes" component={DisputesManagement} />
      <Route path="/impact" component={Impact} />
      <Route path="/trace/:lotCode" component={TraceLot} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
