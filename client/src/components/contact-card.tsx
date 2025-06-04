import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Building, Mail, ChevronRight } from "lucide-react";
import { Contact } from "@shared/schema";

interface ContactCardProps {
  contact: Contact;
}

export default function ContactCard({ contact }: ContactCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'активный': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'новый': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'в процессе': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-primary-500 to-primary-600',
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Link href={`/contacts/${contact.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarColor(contact.name)} rounded-xl flex items-center justify-center`}>
              <span className="text-white font-semibold">
                {getInitials(contact.name)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">
                {contact.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {contact.position || 'Должность не указана'}
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                {contact.company && (
                  <span className="flex items-center">
                    <Building className="w-4 h-4 mr-1" />
                    {contact.company}
                  </span>
                )}
                {contact.email && (
                  <span className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {contact.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs font-medium ${getStatusColor(contact.status)}`}>
              {contact.status || 'Не указан'}
            </Badge>
            <ChevronRight className="text-gray-400 w-5 h-5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
