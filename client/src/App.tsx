import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import FpoStudio from "./pages/FpoStudio";
import Impact from "./pages/Impact";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";
import Operations from "./pages/Operations";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/marketplace" component={Marketplace} /><Route path="/operations" component={Operations} /><Route path="/fpo-studio" component={FpoStudio} /><Route path="/impact" component={Impact} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
