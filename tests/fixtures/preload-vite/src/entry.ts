export const loadFeature = async (): Promise<unknown> => await import('./feature')
export const loadOther = async (): Promise<unknown> => await import('./other')

void loadFeature()
void loadOther()
