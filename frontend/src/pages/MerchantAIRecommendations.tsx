import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar, Users, TrendingUp, Loader2, AlertCircle, Star, Eye } from "lucide-react";
import MerchantLayout from "@/components/MerchantLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiGetMerchantRecommendationStats } from "@/lib/api";
import { toast } from "sonner";

const MerchantAIRecommendations = () => {
  const { token } = useAuth() as any;
  const [stats, setStats] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useSta
