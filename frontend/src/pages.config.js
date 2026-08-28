import AppHome from './pages/AppHome';
import BillingCancel from './pages/BillingCancel';
import BillingSuccess from './pages/BillingSuccess';
import CitySelection from './pages/CitySelection';
import Dashboard from './pages/Dashboard';
import ExpertPreview from './pages/ExpertPreview';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Index from './pages/Index';
import NewAnalysis from './pages/NewAnalysis';
import NewAnalysisProtected from './pages/NewAnalysisProtected';
import PlanSelection from './pages/PlanSelection';
import Results from './pages/Results';
import Transition from './pages/Transition';
import Legal from './pages/Legal';
import __Layout from './Layout.jsx';


const PAGES = {
    "AppHome": AppHome,
    "BillingCancel": BillingCancel,
    "BillingSuccess": BillingSuccess,
    "Dashboard": Dashboard,
    "ExpertPreview": ExpertPreview,
    "Home": Landing,
    "Landing": Landing,
    "Index": Index,
    "NewAnalysis": NewAnalysis,
    "NewAnalysisProtected": NewAnalysisProtected,
    "PlanSelection": PlanSelection,
    "CitySelection": CitySelection,
    "Results": Results,
    "Transition": Transition,
    "Legal": Legal,
};

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};