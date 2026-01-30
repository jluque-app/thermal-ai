import AppHome from './pages/AppHome';
import BillingCancel from './pages/BillingCancel';
import BillingSuccess from './pages/BillingSuccess';
import Dashboard from './pages/Dashboard';
import ExpertPreview from './pages/ExpertPreview';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Index from './pages/Index';
import NewAnalysis from './pages/NewAnalysis';
import NewAnalysisProtected from './pages/NewAnalysisProtected';
import PlanSelection from './pages/PlanSelection';
import Results from './pages/Results';
import __Layout from './Layout.jsx';


const PAGES = {
    "AppHome": AppHome,
    "BillingCancel": BillingCancel,
    "BillingSuccess": BillingSuccess,
    "Dashboard": Dashboard,
    "ExpertPreview": ExpertPreview,
    "Home": Home,
    "Landing": Landing,
    "Index": Index,
    "NewAnalysis": NewAnalysis,
    "NewAnalysisProtected": NewAnalysisProtected,
    "PlanSelection": PlanSelection,
    "Results": Results,
};

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};