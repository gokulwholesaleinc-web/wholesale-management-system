import React, { useState, useEffect } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceSearchButtonProps {
  onSearchResult: (text: string) => void;
}

export function VoiceSearchButton({ onSearchResult }: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Update internal state based on recognition state
  useEffect(() => {
    setIsListening(listening);
  }, [listening]);

  // When transcript changes and we have content, pass it to parent
  useEffect(() => {
    if (transcript && !listening && isListening) {
      onSearchResult(transcript);
      setIsListening(false);
      
      toast({
        title: "Voice search complete",
        description: `Searching for: "${transcript}"`,
        duration: 3000,
      });
    }
  }, [transcript, listening, isListening, onSearchResult, toast]);

  const toggleListening = () => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        title: "Voice Search Not Available",
        description: "Your browser doesn't support voice recognition. Try a different browser like Chrome.",
        variant: "destructive",
      });
      return;
    }
    
    if (isListening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      resetTranscript();
      setIsListening(true);
      SpeechRecognition.startListening({ continuous: false });
      
      toast({
        title: "Listening...",
        description: "Speak now to search products",
        duration: 3000,
      });
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => {
          toast({
            title: "Voice Search Not Available",
            description: "Your browser doesn't support voice recognition. Try a different browser like Chrome.",
            variant: "destructive",
          });
        }}
        className="h-10 w-10"
      >
        <MicOff className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      variant={isListening ? "destructive" : "outline"} 
      size="icon" 
      onClick={toggleListening}
      className={`h-10 w-10 transition-all ${isListening ? 'animate-pulse' : ''}`}
    >
      {isListening ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}