import { format, isSameDay, startOfToday, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateSelectorProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    viewDate: Date;
    onViewDateChange: (date: Date) => void;
    weekDates: Date[];
}

export function DateSelector({
    selectedDate,
    onSelectDate,
    viewDate,
    onViewDateChange,
    weekDates,
}: DateSelectorProps) {
    return (
        <>
            {/* Mobile Date Strip */}
            <div className="md:hidden flex items-center gap-3 pl-4 pr-2 pt-2">
                <div className="flex-1 -mr-2 overflow-hidden">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-4 pb-2 snap-x mask-fade-right">
                        {weekDates.map((date) => {
                            const isSelected = isSameDay(date, selectedDate);
                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => onSelectDate(date)}
                                    className={cn(
                                        'flex-shrink-0 flex flex-col items-center justify-center min-w-[48px] h-12 rounded-xl transition-all snap-start border',
                                        isSelected
                                            ? 'bg-primary border-primary text-primary-foreground shadow-sm scale-100'
                                            : 'bg-card border-border/50 text-muted-foreground scale-95 opacity-70'
                                    )}
                                >
                                    <span className="text-[9px] uppercase font-bold tracking-wider opacity-90">
                                        {format(date, 'EEE')}
                                    </span>
                                    <span className={cn("text-lg font-bold leading-none", isSelected ? "text-primary-foreground" : "text-foreground")}>
                                        {format(date, 'd')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Calendar Picker Trigger */}
                <div className="flex-shrink-0 pl-1 border-l border-border/50">
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-foreground active:scale-95 transition-all">
                                <CalendarIcon className="h-5 w-5" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && onSelectDate(date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Desktop Date Navigation */}
            <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center bg-background rounded-full border border-border/50 p-1">
                    <button
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-full"
                        onClick={() => onViewDateChange(addDays(viewDate, -7))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex items-center px-1">
                        {weekDates.map((date) => {
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, startOfToday());

                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => onSelectDate(date)}
                                    className={cn(
                                        'flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all relative mx-0.5',
                                        isSelected
                                            ? 'bg-primary/5 text-primary border border-primary/20 font-medium'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    )}
                                >
                                    <span className="text-[9px] uppercase tracking-wider leading-none mb-0.5 opacity-70">
                                        {format(date, 'EEE')}
                                    </span>
                                    <span className="text-sm font-medium leading-none">
                                        {format(date, 'd')}
                                    </span>
                                    {isToday && !isSelected && (
                                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-primary rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-full"
                        onClick={() => onViewDateChange(addDays(viewDate, 7))}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <button className="font-display text-lg font-medium text-foreground tracking-tight hover:text-primary transition-colors">
                            {format(selectedDate, 'MMMM yyyy')}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && onSelectDate(date)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </>
    );
}
