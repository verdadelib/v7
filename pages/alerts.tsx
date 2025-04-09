
import React, { useState, useEffect } from 'react';
import { Campaign } from '@/entities/Campaign';
import { Alert } from '@/entities/Alert';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Filter
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      generateRandomAlert();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    applyFilter();
  }, [alerts, filter]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const alertData = await Alert.list();
      
      if (alertData.length === 0) {
        const initialAlerts = generateInitialAlerts();
        setAlerts(initialAlerts);
      } else {
        setAlerts(alertData);
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar alertas",
        description: "Não foi possível carregar os alertas."
      });
    } finally {
      setLoading(false);
    }
  };
  
  const generateInitialAlerts = () => {
    const initialAlerts = [
      {
        type: "info",
        message: "Nova campanha criada com sucesso",
        created_date: new Date().toISOString(),
        read: false
      },
      {
        type: "warning",
        message: "CTR abaixo do esperado na campanha principal",
        metric: "CTR",
        value: parseFloat((1.2).toFixed(2)),
        threshold: parseFloat((2.0).toFixed(2)),
        created_date: new Date().toISOString(),
        read: false
      },
      {
        type: "success",
        message: "Meta de faturamento atingida para o mês atual",
        metric: "Faturamento",
        value: parseFloat((15000).toFixed(2)),
        threshold: parseFloat((10000).toFixed(2)),
        created_date: new Date().toISOString(),
        read: false
      },
      {
        type: "error",
        message: "Taxa de conversão crítica nos últimos 7 dias",
        metric: "Taxa de Conversão",
        value: parseFloat((0.8).toFixed(2)),
        threshold: parseFloat((2.5).toFixed(2)),
        created_date: new Date().toISOString(),
        read: false
      }
    ];

    initialAlerts.forEach(async (alert) => {
      try {
        await Alert.create(alert);
      } catch (error) {
        console.error('Erro ao criar alerta inicial:', error);
      }
    });
    
    return initialAlerts;
  };
  
  const generateRandomAlert = async () => {
    if (Math.random() > 0.7) {
      const alertTypes = ["info", "warning", "success", "error"];
      const randomType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
      
      let alertMessage = "";
      let metric = null;
      let value = null;
      let threshold = null;
      
      switch (randomType) {
        case "info":
          alertMessage = "Novas métricas disponíveis para análise";
          break;
        case "warning":
          metric = "CPC";
          value = parseFloat((2 + Math.random() * 3).toFixed(2));
          threshold = parseFloat((2.00).toFixed(2));
          alertMessage = `CPC aumentou para R$ ${value} (limite: R$ ${threshold})`;
          break;
        case "success":
          metric = "Leads";
          value = Math.floor(50 + Math.random() * 50);
          threshold = "50";
          alertMessage = `${value} novos leads gerados hoje (meta: ${threshold})`;
          break;
        case "error":
          metric = "ROI";
          value = parseFloat((-10 + Math.random() * 8).toFixed(2));
          threshold = parseFloat("0");
          alertMessage = `ROI negativo de ${value}% na campanha principal`;
          break;
      }
      
      const newAlert = {
        type: randomType,
        message: alertMessage,
        metric,
        value,
        threshold,
        created_date: new Date().toISOString(),
        read: false
      };
      
      try {
        const created = await Alert.create(newAlert);
        setAlerts(prev => [created, ...prev]);
      } catch (error) {
        console.error('Erro ao criar alerta:', error);
      }
    }
  };

  const applyFilter = () => {
    if (filter === "all") {
      setFilteredAlerts(alerts);
    } else if (filter === "unread") {
      setFilteredAlerts(alerts.filter(alert => !alert.read));
    } else {
      setFilteredAlerts(alerts.filter(alert => alert.type === filter));
    }
  };
  
  const markAsRead = async (alertId) => {
    try {
      const alertToUpdate = alerts.find(a => a.id === alertId);
      if (!alertToUpdate) {
        console.error(`Alerta com ID ${alertId} não encontrado`);
        return;
      }
      
      await Alert.update(alertId, { read: true });
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, read: true } : alert
        )
      );
    } catch (error) {
      console.error('Erro ao marcar alerta como lido:', error);
      toast({
        variant: "destructive",
        title: "Erro ao marcar alerta",
        description: "Não foi possível marcar o alerta como lido."
      });
    }
  };
  
  const markAllAsRead = async () => {
    try {
      const updates = [];
      
      for (const alert of alerts) {
        if (!alert.read) {
          try {
            await Alert.update(alert.id, { read: true });
            updates.push(alert.id);
          } catch (err) {
            console.error(`Error updating alert ${alert.id}:`, err);
          }
        }
      }
      
      if (updates.length > 0) {
        setAlerts(prev => 
          prev.map(alert => 
            updates.includes(alert.id) ? { ...alert, read: true } : alert
          )
        );
        
        toast({
          title: "Sucesso",
          description: `${updates.length} alertas marcados como lidos.`,
        });
      }
    } catch (error) {
      console.error('Erro ao marcar todos alertas como lidos:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar todos alertas como lidos."
      });
    }
  };
  
  const deleteAlert = async (alertId) => {
    try {
      const alertToDelete = alerts.find(a => a.id === alertId);
      if (!alertToDelete) {
        console.error(`Alerta com ID ${alertId} não encontrado`);
        return;
      }
      
      await Alert.delete(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast({
        title: "Alerta excluído",
        description: "O alerta foi removido com sucesso."
      });
    } catch (error) {
      console.error('Erro ao excluir alerta:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir alerta",
        description: "Não foi possível excluir o alerta."
      });
    }
  };
  
  const clearAllAlerts = async () => {
    try {
      const deletePromises = alerts.map(async (alert) => {
        try {
          const alertExists = await Alert.list(`id == "${alert.id}"`);
          if (alertExists && alertExists.length > 0) {
            await Alert.delete(alert.id);
            return true;
          }
          return false;
        } catch (error) {
          console.error(`Erro ao excluir alerta ${alert.id}:`, error);
          return false;
        }
      });
      
      await Promise.all(deletePromises);
      
      setAlerts([]);
      toast({
        title: "Alertas limpos",
        description: "Todos os alertas foram removidos."
      });
    } catch (error) {
      console.error('Erro ao limpar todos os alertas:', error);
      toast({
        variant: "destructive",
        title: "Erro ao limpar alertas",
        description: "Ocorreu um erro ao tentar remover todos os alertas."
      });
    }
  };
  
  const getAlertIcon = (type) => {
    switch (type) {
      case "info":
        return <Info className="h-5 w-5 text-[#3a7ebf]" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-[#FFC107]" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-[#4CAF50]" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-[#f44336]" />;
      default:
        return <Bell className="h-5 w-5 text-[#9ca3af]" />;
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM, HH:mm", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black bg-gradient-to-r from-[#3a7ebf] to-[#5ca2e2] text-transparent bg-clip-text">
        Alertas e Notificações
      </h1>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className={cn(
              filter === "all" ? "bg-[#3a7ebf]" : "border-[#2d62a3]/40 text-gray-300",
              "neo-button"
            )}
          >
            <Bell className="mr-2 h-4 w-4" />
            Todos
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            onClick={() => setFilter("unread")}
            className={cn(
              filter === "unread" ? "bg-[#3a7ebf]" : "border-[#2d62a3]/40 text-gray-300",
              "neo-button"
            )}
          >
            <Eye className="mr-2 h-4 w-4" />
            Não Lidos
            {alerts.filter(a => !a.read).length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {alerts.filter(a => !a.read).length}
              </Badge>
            )}
          </Button>
          <Button
            variant={filter === "error" ? "default" : "outline"}
            onClick={() => setFilter("error")}
            className={cn(
              filter === "error" ? "bg-[#f44336]" : "border-[#2d62a3]/40 text-gray-300",
              "neo-button"
            )}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Críticos
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={markAllAsRead}
            className="border-[#2d62a3] neo-button"
            disabled={!alerts.some(a => !a.read)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar Todos como Lidos
          </Button>
          <Button 
            variant="destructive" 
            onClick={clearAllAlerts}
            className="neo-button"
            disabled={alerts.length === 0}
          >
            Limpar Todos
          </Button>
        </div>
      </div>
      
      <Card className="neo-brutal">
        <CardHeader>
          <CardTitle className="text-lg font-black text-[#3a7ebf] flex justify-between items-center">
            <span>Notificações do Sistema</span>
            <div className="text-xs font-normal text-gray-400 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Atualização automática
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3a7ebf]"></div>
            </div>
          ) : (
            <>
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-400">Nenhuma notificação encontrada</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Novas notificações aparecerão aqui automaticamente
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {filteredAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "p-4 rounded-lg transition-all",
                          alert.read ? "neo-brutal opacity-70" : "neo-brutal border-2",
                          alert.type === "info" && !alert.read && "border-[#3a7ebf]",
                          alert.type === "warning" && !alert.read && "border-[#FFC107]",
                          alert.type === "success" && !alert.read && "border-[#4CAF50]",
                          alert.type === "error" && !alert.read && "border-[#f44336]"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-opacity-20 p-3 rounded-full neo-inset">
                            {getAlertIcon(alert.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className={cn(
                                  "font-bold",
                                  alert.type === "info" && "text-[#3a7ebf]",
                                  alert.type === "warning" && "text-[#FFC107]",
                                  alert.type === "success" && "text-[#4CAF50]",
                                  alert.type === "error" && "text-[#f44336]"
                                )}>
                                  {alert.message}
                                </p>
                                {alert.metric && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="outline" className="neo-inset">
                                      {alert.metric}: {parseFloat(alert.value).toFixed(2)}
                                    </Badge>
                                    {alert.threshold && (
                                      <Badge variant="outline" className="neo-inset">
                                        Meta: {parseFloat(alert.threshold).toFixed(2)}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">
                                {formatDate(alert.created_date)}
                              </span>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markAsRead(alert.id)}
                                disabled={alert.read}
                                className={cn(
                                  "neo-button",
                                  alert.read ? "opacity-50" : "border-[#2d62a3]"
                                )}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                {alert.read ? "Lido" : "Marcar como Lido"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAlert(alert.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/20"
                              >
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
