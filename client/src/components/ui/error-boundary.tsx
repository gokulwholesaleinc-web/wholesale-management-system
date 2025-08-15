import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <CardTitle className="flex items-center text-red-700">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-gray-700">
                  We're sorry, but there was an error loading this section of the application.
                </p>
                
                <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600 max-h-32 overflow-auto">
                  {this.state.error && <p className="font-medium">{this.state.error.toString()}</p>}
                  {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                    <pre className="mt-2 text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2 border-t bg-gray-50">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
              >
                Return Home
              </Button>
              <Button 
                onClick={this.handleReset}
                className="flex items-center"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };